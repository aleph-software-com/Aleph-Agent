import type { HandoffConfig } from '../types/agents.js';
import type { EngineEmitter, EngineOptions, EngineResult } from './types.js';
import { resolveHandoffTarget } from './pipeline-graph.js';

const now = () => new Date().toISOString();

export interface HandoffInput {
  tool: { name: string; type: string; config: HandoffConfig };
  toolCallArgs: string;
  agentName: string;
  prevConv: any[];
  contentAccum: string;
  emitter: EngineEmitter;
  options?: EngineOptions;
}

export interface HandoffOutput {
  /** null = end response (agent mode / external pipeline) */
  handoffResult: EngineResult['handoff'] | null;
}

/**
 * Unified handoff logic — used by both agent and pipeline modes.
 *
 * 1. Builds the common payload (previous_messages, context_options, etc.)
 * 2. Emits debug + handoff events to the frontend
 * 3. Resolves pipeline target if applicable
 * 4. Returns handoffResult for pipeline continuation, or null to end response
 */
export function processHandoff(input: HandoffInput): HandoffOutput {
  const { tool, toolCallArgs, agentName, prevConv, contentAccum, emitter, options } = input;
  const config = tool.config;
  const reason = (() => { try { return JSON.parse(toolCallArgs).reason || ''; } catch { return ''; } })();

  // Resolve target (pipeline mode only)
  const resolved = (options?.pipelineFlowData && options?.currentAgentId)
    ? resolveHandoffTarget(options.pipelineFlowData, options.currentAgentId, tool.name)
    : null;
  const targetAgentId = resolved?.agentId ?? null;
  const targetAgentVersion = resolved?.agentVersion ?? null;

  const isPipelineInternal = !!(options?.pipelineFlowData && targetAgentId);
  const label = isPipelineInternal
    ? `Handoff pipeline: ${agentName} -> ${tool.name}`
    : options?.pipelineFlowData
      ? `Handoff externe -> ${tool.name}`
      : `Changement d'agent -> ${tool.name}`;

  // Common payload sent to frontend
  const handoffPayload = {
    tool_name: tool.name,
    target_type: config.target_type,
    transfer_message: config.transfer_message,
    context_options: config.context_options,
    reason,
    previous_messages: prevConv,
  };

  // Logs
  console.log(`\n>>> HANDOFF: ${label}`);
  console.log(`    context_options: ${JSON.stringify(config.context_options)}`);
  console.log(`    previous_messages: ${prevConv.length} message(s)`);

  // Events
  emitter.emit('debug', { type: 'handoff', content: label, reason, timestamp: now() });
  emitter.emit('handoff', handoffPayload);

  if (isPipelineInternal) {
    // Flush streamed text + send transfer message
    if (contentAccum) emitter.emit('flush', {});
    if (config.transfer_message) emitter.emit('transfer', { content: config.transfer_message });

    return {
      handoffResult: {
        targetAgentId: targetAgentId!,
        targetAgentVersion,
        contextOptions: config.context_options || ['full'],
        transferMessage: config.transfer_message || null,
        pendingHandoff: handoffPayload,
        historyBeforeSwitch: prevConv,
      },
    };
  }

  // Agent mode or external pipeline: end response
  return { handoffResult: null };
}
