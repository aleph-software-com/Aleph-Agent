/**
 * SessionManager — ensures only one request runs per session at a time.
 *
 * When a new request arrives for a session that's already processing:
 * 1. Aborts the current LLM stream
 * 2. Waits for the session save to complete
 * 3. Only then lets the new request proceed
 *
 * This prevents race conditions where a new request loads stale session data
 * because the previous request hasn't saved yet.
 */

interface ActiveSession {
  abortController: AbortController;
  /** Resolves when the session has been saved after engine completes */
  savePromise: Promise<void>;
}

const active = new Map<string, ActiveSession>();

/**
 * Acquire a session slot. Interrupts any in-flight request for this session
 * and waits for its save to complete before returning.
 *
 * Returns { abortController, release }.
 * - abortController: pass its signal to runAgentLoop
 * - release(): MUST be called after session save (in finally block)
 */
export async function acquireSession(sessionId: string): Promise<{
  abortController: AbortController;
  release: () => void;
}> {
  // Interrupt current request if any
  const current = active.get(sessionId);
  if (current) {
    console.log(`>>> SESSION ${sessionId}: interrupting previous request`);
    current.abortController.abort();
    await current.savePromise;
    console.log(`>>> SESSION ${sessionId}: previous request saved, proceeding`);
  }

  const abortController = new AbortController();
  let resolveSave!: () => void;
  const savePromise = new Promise<void>((resolve) => { resolveSave = resolve; });

  active.set(sessionId, { abortController, savePromise });

  return {
    abortController,
    release: () => {
      // Only clean up if we're still the active session
      if (active.get(sessionId)?.abortController === abortController) {
        active.delete(sessionId);
      }
      resolveSave();
    },
  };
}
