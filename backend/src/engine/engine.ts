import OpenAI from 'openai';
import type { Tool, HandoffConfig } from '../types/agents.js';
import type { EngineContext, EngineEmitter, EngineOptions, EngineResult } from './types.js';
import { buildIdentityPrompt, buildTaskPrompt } from './prompts.js';
import { findInitialTask, buildRoutingMaps } from './canvas.js';
import { toOpenAITool, executeTool } from './tools.js';
import { resolveTaskRoute } from './conditions.js';
import { buildContext, cleanOrphanedToolCalls } from './context.js';
import { processHandoff } from './handoff.js';
import { decrypt } from '../utils/crypto.js';

const MAX_ITERATIONS = 10;

const now = () => new Date().toISOString();

/**
 * Unified agent loop — used by both agent and pipeline routes.
 *
 * In agent mode: handoff → returns result with handoff data (caller ends response)
 * In pipeline mode: handoff → resolves target agent, returns result (caller continues outer loop)
 */
export async function runAgentLoop(
  ctx: EngineContext,
  emitter: EngineEmitter,
  options?: EngineOptions,
  abortSignal?: AbortSignal,
): Promise<EngineResult> {
  const {
    agent, tasks, allTools, canvasAgentTools, canvasTaskToolMap,
    session, lastUserMsg,
    pipelineName, pipelinePrompt,
    transferredMsgCount = 0,
    pendingHandoff: incomingHandoff,
  } = ctx;

  let { restoredHistory, contextSummary, runtimeVariables, completedTasks } = ctx;

  // Make mutable copies
  runtimeVariables = { ...runtimeVariables };
  completedTasks = new Set(completedTasks);

  const taskMap = new Map<string, any>();
  tasks.forEach((t: any) => taskMap.set(t.name, t));

  // Sanitized name → tool record (for execution lookup)
  const toolMap = new Map<string, Tool>();
  for (const [, t] of allTools) {
    toolMap.set(t.name.replace(/[^a-zA-Z0-9_-]/g, '_'), t);
  }

  // Routing maps
  const { taskRoutes } = buildRoutingMaps(agent.flow_data, tasks);

  // ── Task state ──
  let activeTask: any | null = null;
  if (session.active_task_name && completedTasks.size > 0) {
    // Restore from session (only if tasks were already in progress)
    activeTask = taskMap.get(session.active_task_name) || null;
  }
  if (!activeTask && session.active_task_name) {
    activeTask = taskMap.get(session.active_task_name) || null;
  }
  if (!activeTask) {
    const initialTask = findInitialTask(agent.flow_data, tasks);
    if (initialTask) {
      activeTask = initialTask;
      emitter.emit('debug', { type: 'task_enter', content: initialTask.name, timestamp: now() });
    }
  }

  // ── Dynamic OpenAI tools based on canvas + active task ──
  function buildOpenAITools(currentTask: any | null): OpenAI.Chat.Completions.ChatCompletionTool[] {
    const result = canvasAgentTools.map(toOpenAITool);
    if (currentTask) {
      const taskTools = canvasTaskToolMap.get(currentTask.name) || [];
      for (const t of taskTools) result.push(toOpenAITool(t));
    }
    return result;
  }

  let openaiTools = buildOpenAITools(activeTask);

  // ── Build full history (clean orphaned tool_calls + add user message) ──
  const cleanedHistory = cleanOrphanedToolCalls(restoredHistory);
  const fullHistory = [
    ...cleanedHistory,
    ...(lastUserMsg ? [{ role: lastUserMsg.role, content: lastUserMsg.content }] : []),
  ];

  // Tools are only allowed when there's actual user input.
  // No user message = no tools (the LLM can only produce a text greeting).
  const hasUserInput = !!lastUserMsg || cleanedHistory.some((m: any) => m.role === 'user');
  if (!hasUserInput) openaiTools = [];

  // After tool execution, tools are disabled so the LLM must respond in text.
  // This flag is set after the first tool round to force a text-only follow-up.
  let toolsConsumed = false;

  // ── Context management (window + summary) ──
  const llmConfig = (agent.llm_config || {}) as any;
  // Resolve API key: decrypt from snapshot if present, fallback to .env
  const encryptedKey = (agent.llm_config as any)?.api_key_encrypted;
  let resolvedApiKey = process.env.OPENAI_API_KEY;
  if (encryptedKey) {
    try { resolvedApiKey = decrypt(encryptedKey); } catch { /* fallback to .env */ }
  }

  const { processedHistory, contextSummary: updatedSummary, compactionEvent } =
    await buildContext({ fullHistory, llmConfig, existingSummary: contextSummary, apiKey: resolvedApiKey });
  contextSummary = updatedSummary;

  // ── Build LLM messages ──
  const memoryPrompt = contextSummary ? `[MÉMOIRE — résumé des échanges précédents]\n${contextSummary}` : null;
  const taskPrompt = buildTaskPrompt(activeTask);
  let hasTaskSlot = !!taskPrompt;

  const hasPipelinePrompt = !!pipelinePrompt;
  const llmMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (hasPipelinePrompt) {
    llmMessages.push({ role: 'system', content: `[PIPELINE]\n${pipelinePrompt}` });
  }
  llmMessages.push({ role: 'system', content: buildIdentityPrompt(agent.system_prompt || '') });
  if (taskPrompt) llmMessages.push({ role: 'system', content: taskPrompt });
  if (memoryPrompt) llmMessages.push({ role: 'system', content: memoryPrompt });

  let systemSlotCount = (hasPipelinePrompt ? 1 : 0) + 1 + (hasTaskSlot ? 1 : 0) + (memoryPrompt ? 1 : 0);

  llmMessages.push(...processedHistory);

  // ── Compaction events ──
  let pendingCompaction: any = null;
  if (compactionEvent) {
    const userTurnCount = fullHistory.filter((m: any) => m.role === 'user').length;
    const keptTurns = compactionEvent.snapshot_after.filter((m: any) => m.role === 'user').length;
    const desc = compactionEvent.summary_generated
      ? `Context compacté: ${userTurnCount} tours → résumé + ${keptTurns} derniers tours`
      : `Fenêtre glissante: ${userTurnCount} tours → ${keptTurns} derniers tours`;
    pendingCompaction = {
      description: desc,
      before_count: userTurnCount,
      after_count: keptTurns,
      summary_generated: compactionEvent.summary_generated,
      before: compactionEvent.snapshot_before,
      after: compactionEvent.snapshot_after,
      summary: contextSummary,
    };
    emitter.emit('debug', { type: 'context_compact', content: desc, timestamp: now() });
  }

  // Current handoff data for context display
  let pendingHandoff = incomingHandoff || null;

  /** Update the task system message slot */
  function updateTaskSlot(newTask: any | null) {
    const newPrompt = buildTaskPrompt(newTask);
    const taskIdx = (hasPipelinePrompt ? 1 : 0) + 1;
    if (hasTaskSlot && newPrompt) {
      llmMessages[taskIdx] = { role: 'system', content: newPrompt };
    } else if (hasTaskSlot && !newPrompt) {
      llmMessages.splice(taskIdx, 1);
      hasTaskSlot = false;
      systemSlotCount--;
    } else if (!hasTaskSlot && newPrompt) {
      llmMessages.splice(taskIdx, 0, { role: 'system', content: newPrompt });
      hasTaskSlot = true;
      systemSlotCount++;
    }
  }

  // ── Model config ──
  const model = agent.llm_model || (agent.llm_config as any)?.model || 'gpt-4o';
  const temperature = (agent.llm_config as any)?.temperature ?? 0.7;

  const openai = new OpenAI({ apiKey: resolvedApiKey });

  // ── Helper: build context event payload ──
  function buildContextPayload(): any {
    const displayMessages = transferredMsgCount > 0
      ? [...llmMessages.slice(0, systemSlotCount), ...llmMessages.slice(systemSlotCount + transferredMsgCount)]
      : llmMessages;

    const headers: any[] = [];
    if (pipelineName) headers.push({ role: 'pipeline', name: pipelineName });
    headers.push({ role: 'agent', name: agent.name, temperature });

    const payload: any = {
      messages: [...headers, ...displayMessages],
      tools: openaiTools.map((t) => (t as any).function.name),
    };
    if (pendingCompaction) {
      payload.compaction = pendingCompaction;
      pendingCompaction = null;
    }
    if (pendingHandoff) {
      payload.handoff = pendingHandoff;
    }
    return payload;
  }

  // ── Helper: build result ──
  function buildResult(handoff?: EngineResult['handoff']): EngineResult {
    return {
      history: llmMessages.slice(systemSlotCount),
      contextSummary,
      runtimeVariables,
      completedTasks: Array.from(completedTasks),
      activeTaskName: activeTask?.name || null,
      handoff,
    };
  }

  // ── Token usage tracking ──
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  // ── Agent loop ──
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    // Emit context to frontend sidebar
    emitter.emit('context', buildContextPayload());

    // ── Log full prompt layers ──
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ITERATION ${iteration} — LLM CALL`);
    console.log(`${'='.repeat(60)}`);
    for (let i = 0; i < llmMessages.length; i++) {
      const msg = llmMessages[i] as any;
      const role = msg.role?.toUpperCase() || '?';
      if (i < systemSlotCount) {
        const label = i === 0 && hasPipelinePrompt ? 'PIPELINE'
          : (i === (hasPipelinePrompt ? 1 : 0)) ? 'AGENT IDENTITY'
          : (hasTaskSlot && i === (hasPipelinePrompt ? 1 : 0) + 1) ? 'TASK ACTIVE'
          : 'MEMORY';
        console.log(`  [${i}] ${label} (system)`);
        console.log(`      ${String(msg.content).substring(0, 300)}${String(msg.content).length > 300 ? '...' : ''}`);
      } else if (msg.role === 'tool') {
        console.log(`  [${i}] TOOL RESULT (id: ${msg.tool_call_id})`);
        console.log(`      ${String(msg.content).substring(0, 200)}`);
      } else if (msg.tool_calls) {
        const names = msg.tool_calls.map((tc: any) => tc.function?.name).join(', ');
        console.log(`  [${i}] ASSISTANT (tool_calls: ${names})`);
      } else {
        console.log(`  [${i}] ${role}`);
        console.log(`      ${String(msg.content).substring(0, 200)}${String(msg.content).length > 200 ? '...' : ''}`);
      }
    }
    console.log(`${'─'.repeat(60)}\n`);

    // ── Call OpenAI streaming ──
    const stream = await openai.chat.completions.create({
      model,
      temperature,
      messages: llmMessages,
      ...(openaiTools.length > 0 ? { tools: openaiTools } : {}),
      stream: true,
      stream_options: { include_usage: true },
    });

    let contentAccum = '';
    const toolCallsAccum = new Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }>();
    let finishReason: string | null = null;
    let iterationPromptTokens = 0;
    let iterationCompletionTokens = 0;

    let aborted = false;
    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
        aborted = true;
        break;
      }

      // Usage data arrives in the final chunk (choices is empty)
      if (chunk.usage) {
        iterationPromptTokens = chunk.usage.prompt_tokens;
        iterationCompletionTokens = chunk.usage.completion_tokens;
        totalPromptTokens += iterationPromptTokens;
        totalCompletionTokens += iterationCompletionTokens;
      }

      const choice = chunk.choices[0];
      if (!choice) continue;
      finishReason = choice.finish_reason ?? finishReason;
      const delta = choice.delta;

      if (delta?.content) {
        contentAccum += delta.content;
        emitter.emit('token', { t: delta.content });
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallsAccum.has(tc.index)) {
            toolCallsAccum.set(tc.index, { id: '', type: 'function', function: { name: '', arguments: '' } });
          }
          const entry = toolCallsAccum.get(tc.index)!;
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.function.name += tc.function.name;
          if (tc.function?.arguments) entry.function.arguments += tc.function.arguments;
        }
      }
    }

    // Emit token usage for this iteration
    emitter.emit('usage', {
      prompt_tokens: iterationPromptTokens,
      completion_tokens: iterationCompletionTokens,
      total_prompt_tokens: totalPromptTokens,
      total_completion_tokens: totalCompletionTokens,
    });

    // ── Interrupted — save partial text, drop incomplete tool calls ──
    if (aborted) {
      const partialLen = contentAccum.length;
      const droppedTools = toolCallsAccum.size;
      console.log(`\n>>> INTERRUPTION (iteration ${iteration})`);
      console.log(`    Texte partiel: ${partialLen} chars${partialLen > 0 ? ` — "${contentAccum.substring(0, 100)}${partialLen > 100 ? '...' : ''}"` : ' (vide)'}`);
      if (droppedTools > 0) {
        const names = Array.from(toolCallsAccum.values()).map(tc => tc.function.name || '?').join(', ');
        console.log(`    Tool calls DROPPED (incomplets): ${names}`);
      }
      if (contentAccum) {
        llmMessages.push({ role: 'assistant', content: contentAccum + ' [interrompu]' });
      }
      emitter.emit('debug', { type: 'info', content: 'Réponse interrompue par l\'utilisateur', timestamp: now() });
      return buildResult();
    }

    // ── Tool calls ──
    if (finishReason === 'tool_calls' && toolCallsAccum.size > 0) {
      const toolCallsArray = Array.from(toolCallsAccum.values());

      llmMessages.push({
        role: 'assistant',
        content: contentAccum || null,
        tool_calls: toolCallsArray,
      } as any);

      // ── Parallel tool execution ──
      console.log(`\n>>> TOOL CALLS (iteration ${iteration}) — ${toolCallsArray.length} tool(s)`);
      for (const tc of toolCallsArray) {
        console.log(`    DISPATCH: ${tc.function.name}(${tc.function.arguments})`);
      }

      const execResults = await Promise.all(
        toolCallsArray.map(async (tc) => {
          const fnName = tc.function.name;
          const tool = toolMap.get(fnName);
          let result = '{}';
          let variables: Record<string, any> = {};
          let debugMsg = '';

          if (tool) {
            try {
              const parsedArgs = JSON.parse(tc.function.arguments);
              const exec = await executeTool(tool, parsedArgs, runtimeVariables);
              result = exec.result;
              variables = exec.variables;
              debugMsg = exec.debugMsg;
            } catch (err: any) {
              result = JSON.stringify({ error: err.message });
              debugMsg = `ERROR: ${err.message}`;
            }
          } else {
            result = JSON.stringify({ error: 'Tool not found' });
            debugMsg = 'Tool not found';
          }

          console.log(`    RESULT:   ${fnName} → ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`);
          return { tc, fnName, tool, result, variables, debugMsg };
        }),
      );

      // ── Sequential post-processing (routing depends on order) ──
      let handoffResult: EngineResult['handoff'] | undefined;

      for (const { tc, fnName, tool, result, variables } of execResults) {
        const argsPreview = tc.function.arguments === '{}' ? '' : ` ${tc.function.arguments}`;
        const resultPreview = result.length > 300 ? result.substring(0, 300) + '…' : result;
        emitter.emit('debug', {
          type: 'tool_result',
          content: `${fnName}${argsPreview} → ${resultPreview}`,
          timestamp: now(),
        });

        Object.assign(runtimeVariables, variables);
        llmMessages.push({ role: 'tool', tool_call_id: tc.id, content: result } as any);

        if (!tool) continue;

        // ── Handoff check ──
        if (tool.type === 'handoff') {
          const { handoffResult: hr } = processHandoff({
            tool: { name: tool.name, type: tool.type, config: tool.config as HandoffConfig },
            toolCallArgs: tc.function.arguments,
            agentName: agent.name,
            prevConv: llmMessages.slice(systemSlotCount),
            contentAccum,
            emitter,
            options,
          });

          if (hr) {
            // Pipeline internal: continue to next agent
            handoffResult = hr;
            break;
          } else {
            // Agent mode or external pipeline: end response
            return buildResult();
          }
        }

        // ── Exit condition check ──
        if (activeTask && activeTask.exit_condition && tool.name === activeTask.exit_condition) {
          const finishedTaskName = activeTask.name;
          emitter.emit('debug', { type: 'task_exit', content: `${finishedTaskName} (exit: ${tool.name})`, timestamp: now() });
          completedTasks.add(finishedTaskName);

          // Resolve next task from local routes (Task → Task edges)
          const localRoutes = taskRoutes.get(finishedTaskName);
          const nextTaskName = localRoutes
            ? resolveTaskRoute(localRoutes, runtimeVariables, emitter, 'task')
            : null;

          const nextTask = nextTaskName ? taskMap.get(nextTaskName) : null;
          if (nextTask) {
            activeTask = nextTask;
            console.log(`\n>>> TASK TRANSITION: "${finishedTaskName}" → "${nextTask.name}"`);
            emitter.emit('debug', { type: 'task_enter', content: nextTask.name, timestamp: now() });
          } else {
            activeTask = null;
            console.log(`\n>>> TASK END: "${finishedTaskName}" — aucune route suivante`);
            emitter.emit('debug', { type: 'info', content: `Fin du flow — aucune route trouvée après "${finishedTaskName}"`, timestamp: now() });
          }

          updateTaskSlot(activeTask);
          if (!toolsConsumed) openaiTools = buildOpenAITools(activeTask);
        }
      }

      // If handoff was triggered, return immediately
      if (handoffResult) {
        return buildResult(handoffResult);
      }

      // Tools consumed: next iteration the LLM must respond in text only.
      // One tool round per user turn — the agent cannot chain tools autonomously.
      toolsConsumed = true;
      openaiTools = [];

      continue; // next iteration — LLM sees tool results, no tools available
    }

    // ── Text response → done ──
    console.log(`\n>>> REPONSE FINALE (iteration ${iteration}) — ${contentAccum.length} chars`);
    if (contentAccum) {
      console.log(`    "${contentAccum.substring(0, 150)}${contentAccum.length > 150 ? '...' : ''}"`);
      llmMessages.push({ role: 'assistant', content: contentAccum });
    }

    // Send final context snapshot
    emitter.emit('context', buildContextPayload());

    return buildResult();
  }

  // Max iterations reached
  emitter.emit('debug', { type: 'info', content: 'Max iterations atteint', timestamp: now() });
  return buildResult();
}
