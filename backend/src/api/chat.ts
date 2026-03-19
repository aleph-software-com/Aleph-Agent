import { Router } from 'express';
import * as agentsQ from '../queries/agents.js';
import * as pipelinesQ from '../queries/pipelines.js';
import * as sessionsQ from '../queries/chatSessions.js';
import * as apiKeysQ from '../queries/apiKeys.js';
import {
  initSSE, sendEvent,
  resolveCanvasOwnership,
  resolveEntryAgent,
  runAgentLoop,
  type ChatMessage, type EngineContext, type EngineEmitter,
} from '../engine/index.js';
import { acquireSession } from '../engine/session-manager.js';

const router = Router({ mergeParams: true });

const now = () => new Date().toISOString();

// ────────────────────────────────────────
// Shared helper — load agent + build tools + build EngineContext
// ────────────────────────────────────────

interface AgentContextInput {
  agentId: string;
  session: any;
  restoredHistory: any[];
  contextSummary: string | null;
  runtimeVariables: Record<string, any>;
  completedTasks: Set<string>;
  lastUserMsg: { role: string; content: string } | null;
  extraTools?: any[];           // pipeline-level tools to merge
  pipelineName?: string;
  pipelinePrompt?: string;
  transferredMsgCount?: number;
  pendingHandoff?: any;
}

async function buildAgentContext(input: AgentContextInput): Promise<{ ctx: EngineContext; agentFull: any } | { error: string }> {
  const agent = await agentsQ.findById(input.agentId);
  if (!agent) return { error: `Agent ${input.agentId} introuvable` };

  const version = await agentsQ.findVersion(agent.id, agent.current_version);
  const snapshot = version?.snapshot ?? {};
  const agentFull: any = { ...agent, ...snapshot };

  const tasks = agentFull.tasks || [];
  const agentTools: any[] = agentFull.tools || [];
  const extraTools: any[] = input.extraTools || [];

  // Canvas ownership
  const { agentToolNames, taskToolNames } = resolveCanvasOwnership(agentFull.flow_data);

  // Build tool map (agent tools + extra/pipeline tools)
  const allTools = new Map<string, any>();
  for (const t of agentTools) allTools.set(t.name, t);
  for (const t of extraTools) allTools.set(t.name, t);

  const canvasAgentTools: any[] = [];
  for (const name of agentToolNames) {
    const t = allTools.get(name);
    if (t) canvasAgentTools.push(t);
  }
  // Extra tools always available at agent level
  for (const t of extraTools) {
    if (!canvasAgentTools.find((ct: any) => ct.id === t.id)) {
      canvasAgentTools.push(t);
    }
  }

  const canvasTaskToolMap = new Map<string, any[]>();
  for (const [taskLabel, toolNameSet] of taskToolNames) {
    const tls: any[] = [];
    for (const name of toolNameSet) {
      const t = allTools.get(name);
      if (t) tls.push(t);
    }
    canvasTaskToolMap.set(taskLabel, tls);
  }

  const ctx: EngineContext = {
    agent: agentFull,
    tasks,
    allTools,
    canvasAgentTools,
    canvasTaskToolMap,
    session: input.session,
    restoredHistory: input.restoredHistory,
    contextSummary: input.contextSummary,
    runtimeVariables: input.runtimeVariables,
    completedTasks: input.completedTasks,
    lastUserMsg: input.lastUserMsg,
    pipelineName: input.pipelineName,
    pipelinePrompt: input.pipelinePrompt,
    transferredMsgCount: input.transferredMsgCount,
    pendingHandoff: input.pendingHandoff,
  };

  return { ctx, agentFull };
}

// ────────────────────────────────────────
// POST /api/agents/:agentId/chat — stream agent chat
// ────────────────────────────────────────

router.post('/agents/:agentId/chat', async (req, res) => {
  try {
    const { agentId } = req.params as any;
    const { messages, session_id } = req.body as { messages?: ChatMessage[]; session_id?: string };
    const chatMessages: ChatMessage[] = messages && Array.isArray(messages) ? messages : [];

    // Verify agent exists
    const agent = await agentsQ.findById(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // SSE init
    initSSE(res);

    // Session
    let session = session_id ? sessionsQ.findById(session_id) : null;
    if (!session) session = sessionsQ.create(agentId);
    sendEvent(res, 'session', { id: session.id });

    // Acquire session slot
    const { abortController, release } = await acquireSession(session.id);
    res.on('close', () => abortController.abort());
    session = sessionsQ.findById(session.id)!;

    try {
      const lastUserMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

      const result$ = await buildAgentContext({
        agentId,
        session,
        restoredHistory: session.message_history || [],
        contextSummary: session.context_summary || null,
        runtimeVariables: session.runtime_variables || {},
        completedTasks: new Set(session.completed_tasks || []),
        lastUserMsg: lastUserMsg ? { role: lastUserMsg.role, content: lastUserMsg.content } : null,
      });

      if ('error' in result$) {
        sendEvent(res, 'error', { error: result$.error });
        sendEvent(res, 'done', {});
        res.end();
        return;
      }

      const emitter: EngineEmitter = { emit: (event, data) => sendEvent(res, event, data) };
      const result = await runAgentLoop(result$.ctx, emitter, undefined, abortController.signal);

      sessionsQ.update(session.id, {
        active_task_name: result.activeTaskName,
        runtime_variables: result.runtimeVariables,
        completed_tasks: result.completedTasks,
        message_history: result.history,
        context_summary: result.contextSummary,
      });

      sendEvent(res, 'done', {});
      res.end();
    } finally {
      release();
    }
  } catch (err: any) {
    console.error('Chat error:', err);
    if (res.headersSent) {
      sendEvent(res, 'error', { error: err.message || 'Internal server error' });
      res.end();
    } else {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

// ────────────────────────────────────────
// POST /api/pipelines/:pipelineId/chat — stream pipeline chat
// ────────────────────────────────────────

router.post('/pipelines/:pipelineId/chat', async (req, res) => {
  try {
    const { pipelineId } = req.params as any;
    const { messages, session_id } = req.body as { messages?: ChatMessage[]; session_id?: string };
    const chatMessages: ChatMessage[] = messages && Array.isArray(messages) ? messages : [];

    // Load pipeline + snapshot
    const pipeline = await pipelinesQ.findById(pipelineId);
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });

    const pipelineVersion = await pipelinesQ.findVersion(pipelineId, pipeline.current_version);
    const pipelineSnapshot = pipelineVersion?.snapshot ?? {};
    const pipelineFull: any = { ...pipeline, ...pipelineSnapshot };
    const pipelineTools: any[] = pipelineFull.tools || [];

    // SSE init
    initSSE(res);

    // Session
    let session = session_id ? sessionsQ.findById(session_id) : null;
    let currentAgentId: string;

    if (!session) {
      const entryAgentId = resolveEntryAgent(pipelineFull.flow_data);
      if (!entryAgentId) {
        sendEvent(res, 'error', { error: 'Aucun agent d\'entrée trouvé dans le pipeline' });
        sendEvent(res, 'done', {});
        res.end();
        return;
      }
      session = sessionsQ.createPipeline(pipelineId, entryAgentId);
      currentAgentId = entryAgentId;
    } else {
      currentAgentId = session.current_agent_id || session.agent_id;
    }

    sendEvent(res, 'session', { id: session.id });

    // Acquire session slot
    const { abortController, release } = await acquireSession(session.id);
    res.on('close', () => abortController.abort());

    try {
      session = sessionsQ.findById(session.id)!;
      currentAgentId = session.current_agent_id || session.agent_id;

      let runtimeVariables: Record<string, any> = session.runtime_variables ? { ...session.runtime_variables } : {};
      let restoredHistory: any[] = session.message_history || [];
      let contextSummary: string | null = session.context_summary || null;

      const lastUserMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
      let userMsgConsumed = false;

      const emitter: EngineEmitter = { emit: (event, data) => sendEvent(res, event, data) };

      let pendingHandoff: any = null;
      const MAX_AGENT_SWITCHES = 5;
      let agentSwitchCount = 0;

      while (agentSwitchCount <= MAX_AGENT_SWITCHES) {
        const result$ = await buildAgentContext({
          agentId: currentAgentId,
          session,
          restoredHistory,
          contextSummary,
          runtimeVariables,
          completedTasks: new Set(agentSwitchCount === 0 ? (session.completed_tasks || []) : []),
          lastUserMsg: !userMsgConsumed && lastUserMsg ? { role: lastUserMsg.role, content: lastUserMsg.content } : null,
          extraTools: pipelineTools,
          pipelineName: pipelineFull.name,
          pipelinePrompt: pipelineFull.prompt || undefined,
          transferredMsgCount: agentSwitchCount > 0 ? restoredHistory.length : 0,
          pendingHandoff,
        });

        if ('error' in result$) {
          sendEvent(res, 'error', { error: result$.error });
          break;
        }

        sendEvent(res, 'debug', {
          type: 'info',
          content: agentSwitchCount === 0
            ? `Pipeline "${pipelineFull.name}" → Agent "${result$.agentFull.name}"`
            : `Handoff → Agent "${result$.agentFull.name}"`,
          timestamp: now(),
        });
        userMsgConsumed = true;

        const result = await runAgentLoop(result$.ctx, emitter, {
          pipelineFlowData: pipelineFull.flow_data,
          currentAgentId,
        }, abortController.signal);

        // Save session
        sessionsQ.update(session.id, {
          active_task_name: result.activeTaskName,
          runtime_variables: result.runtimeVariables,
          completed_tasks: result.completedTasks,
          message_history: result.history,
          context_summary: result.contextSummary,
          current_agent_id: currentAgentId,
        });

        if (abortController.signal.aborted) return;

        // No handoff → done
        if (!result.handoff) {
          sendEvent(res, 'done', {});
          res.end();
          return;
        }

        // Agent switch — apply context_options
        agentSwitchCount++;
        const handoff = result.handoff;
        pendingHandoff = handoff.pendingHandoff;

        if (handoff.contextOptions.includes('full')) {
          restoredHistory = handoff.historyBeforeSwitch;
          runtimeVariables = result.runtimeVariables;
          contextSummary = result.contextSummary;
        } else if (handoff.contextOptions.includes('extracted')) {
          const extractedVars: Record<string, any> = {};
          for (const [k, v] of Object.entries(result.runtimeVariables)) {
            if (k.startsWith('extraction.')) extractedVars[k] = v;
          }
          const varEntries = Object.entries(extractedVars).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
          restoredHistory = varEntries.length > 0
            ? [{ role: 'system', content: `[CONTEXTE TRANSFÉRÉ — données extraites]\n${varEntries.join('\n')}` }]
            : [];
          runtimeVariables = extractedVars;
          contextSummary = null;
        } else {
          restoredHistory = [];
          runtimeVariables = {};
          contextSummary = null;
        }

        currentAgentId = handoff.targetAgentId;
      }

      // Max switches reached
      sessionsQ.update(session.id, {
        active_task_name: null,
        runtime_variables: runtimeVariables,
        completed_tasks: [],
        message_history: restoredHistory,
        context_summary: contextSummary,
        current_agent_id: currentAgentId,
      });
      sendEvent(res, 'debug', { type: 'info', content: 'Max agent switches atteint', timestamp: now() });
      sendEvent(res, 'done', {});
      res.end();
    } finally {
      release();
    }
  } catch (err: any) {
    console.error('Pipeline chat error:', err);
    if (res.headersSent) {
      sendEvent(res, 'error', { error: err.message || 'Internal server error' });
      res.end();
    } else {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

// ────────────────────────────────────────
// POST /api/v1/chat — Public API (API key auth)
// ────────────────────────────────────────

router.post('/v1/chat', async (req, res) => {
  try {
    // Authenticate via Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer ak-...' });
    }
    const keyValue = authHeader.slice(7);
    const apiKey = await apiKeysQ.findByKey(keyValue);
    if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });
    if (!apiKey.enabled) return res.status(403).json({ error: 'API key is disabled' });

    // Rate limiting (simple per-key check)
    if (apiKey.request_count >= apiKey.rate_limit) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const { messages, session_id } = req.body as { messages?: ChatMessage[]; session_id?: string };
    const chatMessages: ChatMessage[] = messages && Array.isArray(messages) ? messages : [];

    // Determine target: agent or pipeline
    const isAgent = !!apiKey.agent_id;
    const isPipeline = !!apiKey.pipeline_id;

    if (!isAgent && !isPipeline) {
      return res.status(400).json({ error: 'API key is not linked to an agent or pipeline' });
    }

    // Track usage
    await apiKeysQ.incrementUsage(apiKey.id);

    if (isAgent) {
      // ── Agent chat via API key ──
      const agent = await agentsQ.findById(apiKey.agent_id!);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });

      // Use key's pinned version or agent's current version
      const versionNum = apiKey.version ?? agent.current_version;
      const version = await agentsQ.findVersion(agent.id, versionNum);
      const snapshot = version?.snapshot ?? {};
      const agentFull: any = { ...agent, ...snapshot };

      initSSE(res);

      let session = session_id ? sessionsQ.findById(session_id) : null;
      if (!session) session = sessionsQ.create(agent.id);
      sendEvent(res, 'session', { id: session.id });

      // Increment session count on first message
      if (!session_id) {
        await apiKeysQ.incrementSession(apiKey.id);
      }

      const { abortController, release } = await acquireSession(session.id);
      res.on('close', () => abortController.abort());
      session = sessionsQ.findById(session.id)!;

      try {
        const lastUserMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

        const result$ = await buildAgentContext({
          agentId: agent.id,
          session,
          restoredHistory: session.message_history || [],
          contextSummary: session.context_summary || null,
          runtimeVariables: session.runtime_variables || {},
          completedTasks: new Set(session.completed_tasks || []),
          lastUserMsg: lastUserMsg ? { role: lastUserMsg.role, content: lastUserMsg.content } : null,
        });

        if ('error' in result$) {
          sendEvent(res, 'error', { error: result$.error });
          sendEvent(res, 'done', {});
          res.end();
          return;
        }

        const emitter: EngineEmitter = { emit: (event, data) => sendEvent(res, event, data) };
        const result = await runAgentLoop(result$.ctx, emitter, undefined, abortController.signal);

        sessionsQ.update(session.id, {
          active_task_name: result.activeTaskName,
          runtime_variables: result.runtimeVariables,
          completed_tasks: result.completedTasks,
          message_history: result.history,
          context_summary: result.contextSummary,
        });

        sendEvent(res, 'done', {});
        res.end();
      } finally {
        release();
      }
    } else {
      // ── Pipeline chat via API key ──
      const pipeline = await pipelinesQ.findById(apiKey.pipeline_id!);
      if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });

      const versionNum = apiKey.version ?? pipeline.current_version;
      const pipelineVersion = await pipelinesQ.findVersion(pipeline.id, versionNum);
      const pipelineSnapshot = pipelineVersion?.snapshot ?? {};
      const pipelineFull: any = { ...pipeline, ...pipelineSnapshot };
      const pipelineTools: any[] = pipelineFull.tools || [];

      initSSE(res);

      let session = session_id ? sessionsQ.findById(session_id) : null;
      let currentAgentId: string;

      if (!session) {
        const entryAgentId = resolveEntryAgent(pipelineFull.flow_data);
        if (!entryAgentId) {
          sendEvent(res, 'error', { error: 'No entry agent found in pipeline' });
          sendEvent(res, 'done', {});
          res.end();
          return;
        }
        session = sessionsQ.createPipeline(pipeline.id, entryAgentId);
        currentAgentId = entryAgentId;
        await apiKeysQ.incrementSession(apiKey.id);
      } else {
        currentAgentId = session.current_agent_id || session.agent_id;
      }

      sendEvent(res, 'session', { id: session.id });

      const { abortController, release } = await acquireSession(session.id);
      res.on('close', () => abortController.abort());

      try {
        session = sessionsQ.findById(session.id)!;
        currentAgentId = session.current_agent_id || session.agent_id;

        let runtimeVariables: Record<string, any> = session.runtime_variables ? { ...session.runtime_variables } : {};
        let restoredHistory: any[] = session.message_history || [];
        let contextSummary: string | null = session.context_summary || null;

        const lastUserMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
        let userMsgConsumed = false;

        const emitter: EngineEmitter = { emit: (event, data) => sendEvent(res, event, data) };

        let pendingHandoff: any = null;
        const MAX_AGENT_SWITCHES = 5;
        let agentSwitchCount = 0;

        while (agentSwitchCount <= MAX_AGENT_SWITCHES) {
          const result$ = await buildAgentContext({
            agentId: currentAgentId,
            session,
            restoredHistory,
            contextSummary,
            runtimeVariables,
            completedTasks: new Set(agentSwitchCount === 0 ? (session.completed_tasks || []) : []),
            lastUserMsg: !userMsgConsumed && lastUserMsg ? { role: lastUserMsg.role, content: lastUserMsg.content } : null,
            extraTools: pipelineTools,
            pipelineName: pipelineFull.name,
            pipelinePrompt: pipelineFull.prompt || undefined,
            transferredMsgCount: agentSwitchCount > 0 ? restoredHistory.length : 0,
            pendingHandoff,
          });

          if ('error' in result$) {
            sendEvent(res, 'error', { error: result$.error });
            break;
          }

          userMsgConsumed = true;

          const result = await runAgentLoop(result$.ctx, emitter, {
            pipelineFlowData: pipelineFull.flow_data,
            currentAgentId,
          }, abortController.signal);

          sessionsQ.update(session.id, {
            active_task_name: result.activeTaskName,
            runtime_variables: result.runtimeVariables,
            completed_tasks: result.completedTasks,
            message_history: result.history,
            context_summary: result.contextSummary,
            current_agent_id: currentAgentId,
          });

          if (abortController.signal.aborted) return;

          if (!result.handoff) {
            sendEvent(res, 'done', {});
            res.end();
            return;
          }

          agentSwitchCount++;
          const handoff = result.handoff;
          pendingHandoff = handoff.pendingHandoff;

          if (handoff.contextOptions.includes('full')) {
            restoredHistory = handoff.historyBeforeSwitch;
            runtimeVariables = result.runtimeVariables;
            contextSummary = result.contextSummary;
          } else if (handoff.contextOptions.includes('extracted')) {
            const extractedVars: Record<string, any> = {};
            for (const [k, v] of Object.entries(result.runtimeVariables)) {
              if (k.startsWith('extraction.')) extractedVars[k] = v;
            }
            const varEntries = Object.entries(extractedVars).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
            restoredHistory = varEntries.length > 0
              ? [{ role: 'system', content: `[TRANSFERRED CONTEXT — extracted data]\n${varEntries.join('\n')}` }]
              : [];
            runtimeVariables = extractedVars;
            contextSummary = null;
          } else {
            restoredHistory = [];
            runtimeVariables = {};
            contextSummary = null;
          }

          currentAgentId = handoff.targetAgentId;
        }

        sendEvent(res, 'done', {});
        res.end();
      } finally {
        release();
      }
    }
  } catch (err: any) {
    console.error('v1/chat error:', err);
    if (res.headersSent) {
      sendEvent(res, 'error', { error: err.message || 'Internal server error' });
      res.end();
    } else {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

// ────────────────────────────────────────
// DELETE /api/sessions/:id (internal, no auth)
// ────────────────────────────────────────

router.delete('/sessions/:id', (req, res) => {
  sessionsQ.remove(req.params.id);
  res.status(204).end();
});

// ────────────────────────────────────────
// POST /api/v1/sessions/:id/end — Public (API key auth)
// Closes a session and updates API key usage stats.
// ────────────────────────────────────────

router.post('/v1/sessions/:id/end', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer ak-...' });
    }
    const keyValue = authHeader.slice(7);
    const apiKey = await apiKeysQ.findByKey(keyValue);
    if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });

    const { id: sessionId } = req.params;
    const session = sessionsQ.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Verify that the session belongs to this API key's agent or pipeline
    const ownsSession =
      (apiKey.agent_id && session.agent_id === apiKey.agent_id) ||
      (apiKey.pipeline_id && session.pipeline_id === apiKey.pipeline_id);
    if (!ownsSession) {
      return res.status(403).json({ error: 'Session does not belong to this API key' });
    }

    // Remove the session
    sessionsQ.remove(sessionId);

    // Update last_used_at on the API key
    await apiKeysQ.updateLastUsed(apiKey.id);

    res.json({ message: 'Session ended', session_id: sessionId });
  } catch (err: any) {
    console.error('v1/sessions/end error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
