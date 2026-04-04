/**
 * REST + Public SSE API routes.
 *
 * Internal chat (agents/pipelines) uses WebSocket via ws.ts.
 * This file handles:
 *   - POST /api/v1/chat — Public API (SSE, for external consumers with API keys)
 *   - DELETE /api/sessions/:id
 *   - POST /api/v1/sessions/:id/end
 */

import { Router } from 'express';
import * as sessionsQ from '../queries/chatSessions.js';
import * as apiKeysQ from '../queries/apiKeys.js';
import { initSSE, sendEvent, type ChatMessage } from '../engine/index.js';
import { Session } from '../pipeline/session.js';

const router = Router({ mergeParams: true });

// ────────────────────────────────────────
// POST /api/v1/chat — Public API (SSE for external consumers)
// ────────────────────────────────────────

router.post('/v1/chat', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer ak-...' });
    }
    const keyValue = authHeader.slice(7);
    const apiKey = await apiKeysQ.findByKey(keyValue);
    if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });
    if (!apiKey.enabled) return res.status(403).json({ error: 'API key is disabled' });

    if (apiKey.request_count >= apiKey.rate_limit) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const isAgent = !!apiKey.agent_id;
    const isPipeline = !!apiKey.pipeline_id;
    if (!isAgent && !isPipeline) {
      return res.status(400).json({ error: 'API key is not linked to an agent or pipeline' });
    }

    const { messages, session_id } = req.body as { messages?: ChatMessage[]; session_id?: string };
    const chatMessages: ChatMessage[] = messages && Array.isArray(messages) ? messages : [];

    await apiKeysQ.incrementUsage(apiKey.id);
    if (!session_id) await apiKeysQ.incrementSession(apiKey.id);

    initSSE(res);

    const lastUserMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

    const session = isAgent
      ? new Session({ agentId: apiKey.agent_id!, sessionId: session_id || undefined })
      : new Session({ pipelineId: apiKey.pipeline_id!, sessionId: session_id || undefined });

    // Forward session events → SSE
    const events = ['session', 'token', 'usage', 'context', 'debug', 'error', 'done'];
    for (const event of events) {
      session.on(event, (data: any) => sendEvent(res, event, data));
    }

    res.on('close', () => session.stop());

    await session.start();

    if (lastUserMsg) {
      await session.handleUserMessage(lastUserMsg.content);
    }

    session.stop();
    res.end();
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
// DELETE /api/sessions/:id
// ────────────────────────────────────────

router.delete('/sessions/:id', (req, res) => {
  sessionsQ.remove(req.params.id);
  res.status(204).end();
});

// ────────────────────────────────────────
// POST /api/v1/sessions/:id/end
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

    const ownsSession =
      (apiKey.agent_id && session.agent_id === apiKey.agent_id) ||
      (apiKey.pipeline_id && session.pipeline_id === apiKey.pipeline_id);
    if (!ownsSession) {
      return res.status(403).json({ error: 'Session does not belong to this API key' });
    }

    sessionsQ.remove(sessionId);
    await apiKeysQ.updateLastUsed(apiKey.id);

    res.json({ message: 'Session ended', session_id: sessionId });
  } catch (err: any) {
    console.error('v1/sessions/end error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
