import OpenAI from 'openai';

/**
 * Remove orphaned tool_calls from history — assistant messages with tool_calls
 * that don't have matching tool result messages following them.
 * This can happen after interruptions or history truncation.
 */
export function cleanOrphanedToolCalls(history: any[]): any[] {
  // Collect all tool_call_ids that have a matching tool result
  const answeredIds = new Set<string>();
  for (const msg of history) {
    if (msg.role === 'tool' && msg.tool_call_id) {
      answeredIds.add(msg.tool_call_id);
    }
  }

  return history.map((msg) => {
    if (msg.role !== 'assistant' || !msg.tool_calls || msg.tool_calls.length === 0) {
      return msg;
    }

    // Keep only tool_calls that have a matching result
    const kept = msg.tool_calls.filter((tc: any) => answeredIds.has(tc.id));

    if (kept.length === msg.tool_calls.length) return msg; // all matched
    if (kept.length === 0) {
      // No tool calls left — return as plain text message (or skip if no content)
      return msg.content ? { role: 'assistant', content: msg.content } : null;
    }
    return { ...msg, tool_calls: kept };
  }).filter(Boolean);
}

/** Safe window slice based on conversation TURNS (not raw messages).
 *  Each "turn" starts with a user message and includes all subsequent
 *  assistant / tool_calls / tool messages until the next user message. */
export function safeSlice(history: any[], turns: number): { kept: any[]; removed: any[] } {
  const userIndices: number[] = [];
  for (let i = 0; i < history.length; i++) {
    if (history[i].role === 'user') userIndices.push(i);
  }
  if (userIndices.length <= turns) return { kept: history, removed: [] };
  const cutIndex = userIndices[userIndices.length - turns];
  return { kept: history.slice(cutIndex), removed: history.slice(0, cutIndex) };
}

export interface BuildContextParams {
  fullHistory: any[];
  llmConfig: any;
  existingSummary: string | null;
  apiKey?: string;
}

export interface BuildContextResult {
  processedHistory: any[];
  contextSummary: string | null;
  compactionEvent: {
    before: number;
    after: number;
    summary_generated: boolean;
    snapshot_before: any[];
    snapshot_after: any[];
  } | null;
}

/** Process context: apply sliding window + generate summary if needed */
export async function buildContext(params: BuildContextParams): Promise<BuildContextResult> {
  const { fullHistory, llmConfig, existingSummary, apiKey } = params;

  const windowEnabled = !!llmConfig.context_window?.enabled;
  const windowSize = llmConfig.context_window?.size || 10;
  const summaryEnabled = !!llmConfig.context_summary?.enabled;
  const summaryThreshold = llmConfig.context_summary?.threshold || 20;

  const userTurnCount = fullHistory.filter((m: any) => m.role === 'user').length;

  let processedHistory = fullHistory;
  let removed: any[] = [];
  let compactionEvent: BuildContextResult['compactionEvent'] = null;

  // ── Window: slice history into kept / removed ──
  if (windowEnabled && userTurnCount > windowSize) {
    const sliced = safeSlice(fullHistory, windowSize);
    processedHistory = sliced.kept;
    removed = sliced.removed;
    compactionEvent = {
      before: fullHistory.length,
      after: processedHistory.length,
      summary_generated: false,
      snapshot_before: fullHistory,
      snapshot_after: processedHistory,
    };
  }

  // ── Summary: generates incremental memory ──
  let contextSummary = existingSummary;
  const shouldSummarize = summaryEnabled && (
    (windowEnabled && removed.length > 0) ||
    (!windowEnabled && userTurnCount > summaryThreshold)
  );

  if (shouldSummarize) {
    const toSummarize = windowEnabled ? removed : fullHistory;
    const existingPart = contextSummary ? `Résumé précédent:\n${contextSummary}\n\n` : '';
    const messageDump = toSummarize
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => `${m.role}: ${typeof m.content === 'string' ? m.content : '(tool call)'}`)
      .join('\n');

    if (messageDump.trim()) {
      const openaiForSummary = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
      const summaryRes = await openaiForSummary.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui résume des conversations. Produis un résumé concis et factuel qui préserve toutes les informations importantes: noms, préférences, allergies, décisions prises, données collectées. Ne perds aucune information critique. Réponds uniquement avec le résumé, sans introduction.',
          },
          {
            role: 'user',
            content: `${existingPart}Nouveaux messages à intégrer au résumé:\n${messageDump}`,
          },
        ],
      });
      contextSummary = summaryRes.choices[0]?.message?.content || contextSummary;
    }

    if (compactionEvent) compactionEvent.summary_generated = true;
  }

  return { processedHistory, contextSummary, compactionEvent };
}
