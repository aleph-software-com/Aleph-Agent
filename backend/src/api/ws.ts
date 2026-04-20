/**
 * Unified WebSocket transport — single entry point for all interactions.
 *
 * Internal (frontend):
 *   ws://host/api/session/:agentId
 *   ws://host/api/session/pipeline/:pipelineId
 *
 * External (API key):
 *   ws://host/api/session?apiKey=ak-...
 *   The API key determines the target agent or pipeline.
 *
 * SIP bridge (Go SIP server):
 *   ws://host/api/sip/call?agentId=<uuid>
 *   ws://host/api/sip/call?phoneNumber=<e164>
 *   The Go SIP server connects here on each call (inbound or outbound).
 *   Binary PCM16 frames flow in (caller audio → STT),
 *   binary MP3 chunks flow out (TTS → caller audio).
 *
 * Client → Server:
 *   JSON    { type: "message", text: "..." }       Send text to LLM
 *   JSON    { type: "audio_config", sampleRate }    Set audio sample rate
 *   JSON    { type: "hangup" }                      Call ended (SIP only)
 *   Binary  PCM 16-bit LE audio frames              Audio for STT
 *
 * Server → Client:
 *   JSON    All Session events as { type: "...", ...data }
 *   Binary  MP3 audio chunks from TTS
 */

import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import * as apiKeysQ from '../queries/apiKeys.js';
import * as phoneNumbersQ from '../queries/phoneNumbers.js';
import * as agentsQ from '../queries/agents.js';
import { Session } from '../pipeline/session.js';

export function setupWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    // ── Internal: /api/session/:agentId ──
    const agentMatch = url.pathname.match(/^\/api\/session\/([a-f0-9-]+)$/);
    if (agentMatch) {
      return wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        handleConnection(ws, { agentId: agentMatch[1] });
      });
    }

    // ── Internal: /api/session/pipeline/:pipelineId ──
    const pipelineMatch = url.pathname.match(/^\/api\/session\/pipeline\/([a-f0-9-]+)$/);
    if (pipelineMatch) {
      return wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        handleConnection(ws, { pipelineId: pipelineMatch[1] });
      });
    }

    // ── SIP bridge: /api/sip/call?callId=&from=&to= ──
    // Go SIP connects here for every call (inbound or outbound).
    // Backend resolves the agent from the `to` number, sends a decision
    // JSON message first, then bridges audio if answered.
    if (url.pathname === '/api/sip/call') {
      return wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        handleSipConnection(ws, url);
      });
    }

    // ── External: /api/session?apiKey=ak-... ──
    if (url.pathname === '/api/session') {
      const apiKeyValue = url.searchParams.get('apiKey');
      if (!apiKeyValue) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const apiKey = await apiKeysQ.findByKey(apiKeyValue);
      if (!apiKey || !apiKey.enabled) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      if (apiKey.request_count >= apiKey.rate_limit) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
        socket.destroy();
        return;
      }

      await apiKeysQ.incrementUsage(apiKey.id);
      await apiKeysQ.incrementSession(apiKey.id);

      const config = apiKey.agent_id
        ? { agentId: apiKey.agent_id }
        : { pipelineId: apiKey.pipeline_id! };

      return wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        handleConnection(ws, config);
      });
    }
  });

  console.log('[WS] Handler registered on /api/session/:id');
}

// ── SIP connection handler ────────────────────────────────
//
// Protocol (first message is always the decision, then audio):
//
//   Backend → Go  { action: "answer",  agentId: "..." }
//   Backend → Go  { action: "reject",  code: 404, reason: "Not Found" }
//   Backend → Go  { action: "reject",  code: 486, reason: "Busy Here" }
//
//   After "answer":
//   Go → Backend  Binary µ-law 8kHz frames  (caller audio → STT)
//   Backend → Go  Binary µ-law 8kHz chunks  (TTS → caller)
//   Go → Backend  { type: "hangup" }        (caller hung up)

async function handleSipConnection(ws: WebSocket, url: URL): Promise<void> {
  const callId      = url.searchParams.get('callId')  ?? 'unknown';
  const from        = url.searchParams.get('from')    ?? '';
  const to          = url.searchParams.get('to')      ?? '';
  const directAgent = url.searchParams.get('agentId') ?? '';

  const reject = (code: number, reason: string) => {
    if (ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ action: 'reject', code, reason }));
    ws.close();
  };

  // ── 1. Resolve agent ──
  // Outbound: agentId provided directly by Go after 200 OK.
  // Inbound:  resolve from the called number (to) via phone_numbers table.
  let agentId: string;
  if (directAgent) {
    agentId = directAgent;
    console.log(`[SIP-WS] Outbound call ${callId} from=${from} → agent ${agentId}`);
  } else {
    if (!to) return reject(400, 'Missing to param');
    const record = await phoneNumbersQ.findByNumber(to);
    if (!record?.agent_id) {
      console.log(`[SIP-WS] No phone number mapping for ${to} — rejecting call ${callId}`);
      return reject(404, 'Not Found');
    }
    agentId = record.agent_id;
    console.log(`[SIP-WS] Inbound call ${callId} from=${from} to=${to} → agent ${agentId}`);
  }

  const agent = await agentsQ.findById(agentId);
  if (!agent) {
    console.log(`[SIP-WS] Agent ${agentId} not found — rejecting call ${callId}`);
    return reject(503, 'Service Unavailable');
  }

  // ── 2. Decision: answer ──
  console.log(`[DEBUG][SIP-WS] Call ${callId} — sending answer decision to Go`);
  ws.send(JSON.stringify({ action: 'answer', agentId: agent.id }));

  // ── 3. Spawn session and bridge audio (same as browser, isSip=true) ──
  console.log(`[DEBUG][SIP-WS] Call ${callId} — creating Session (isSip=true)`);
  const session = new Session({ agentId: agent.id, isSip: true });

  session.on('audio', (chunk: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
  });

  const events = [
    'session', 'token', 'usage', 'done', 'error',
    'speech_start', 'speech_end', 'utterance',
  ];
  for (const event of events) {
    session.on(event, (data: any) => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: event, ...data }));
    });
  }

  console.log(`[DEBUG][SIP-WS] Call ${callId} — starting session.start() (STT+TTS+greeting init)`);
  try {
    await session.start();
  } catch (err: any) {
    console.error(`[SIP-WS] Session init failed for call ${callId}:`, err.message);
    ws.close();
    return;
  }
  console.log(`[DEBUG][SIP-WS] Call ${callId} — session.start() done, registering audio message handler`);

  let audioPacketCount = 0;
  ws.on('message', async (data: Buffer | string, isBinary: boolean) => {
    if (isBinary && Buffer.isBuffer(data)) {
      audioPacketCount++;
      if (audioPacketCount === 1 || audioPacketCount % 50 === 0)
        console.log(`[DEBUG][SIP-WS] Audio input: packet #${audioPacketCount} — ${data.length} bytes (call ${callId})`);
      await session.processAudio(data).catch((e: any) =>
        console.error('[SIP-WS] Audio error:', e.message));
    } else {
      try {
        const msg = JSON.parse(data.toString());
        console.log(`[DEBUG][SIP-WS] Call ${callId} — text message received: type=${msg.type}`);
        if (msg.type === 'hangup') {
          session.stop();
          ws.close();
        }
      } catch { /* ignore */ }
    }
  });

  ws.on('close', () => {
    session.stop();
    console.log(`[SIP-WS] Call ${callId} ended — session ${session.sessionId}`);
  });

  ws.on('error', (err: Error) => {
    console.error(`[SIP-WS] WS error on call ${callId}:`, err.message);
    session.stop();
  });
}

// ── Per-connection handler (same for internal and external) ──

async function handleConnection(
  ws: WebSocket,
  config: { agentId?: string; pipelineId?: string },
): Promise<void> {
  const send = (payload: Record<string, unknown>) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  const session = new Session(config);

  // Forward all session events → WebSocket
  const events = [
    'session', 'token', 'usage', 'context', 'done', 'error',
    'speech_start', 'speech_end', 'transcript_final', 'utterance',
  ];
  for (const event of events) {
    session.on(event, (data: any) => send({ type: event, ...data }));
  }
  session.on('debug', (data: any) => send({ type: 'debug', data }));

  // TTS audio — binary MP3 chunks
  session.on('audio', (chunk: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
  });

  try {
    await session.start();
  } catch (err: any) {
    send({ type: 'error', error: err.message || 'Session init failed' });
    ws.close(4012, 'Session init failed');
    return;
  }

  ws.on('message', async (data: Buffer | string, isBinary: boolean) => {
    if (isBinary && Buffer.isBuffer(data)) {
      try {
        await session.processAudio(data);
      } catch (err: any) {
        console.error('[WS] Audio processing error:', err.message);
      }
    } else {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'message' && msg.text) {
          await session.handleUserMessage(msg.text);
        } else if (msg.type === 'audio_config' && msg.sampleRate) {
          session.setInputSampleRate(msg.sampleRate);
        }
      } catch { /* ignore */ }
    }
  });

  ws.on('close', () => {
    session.stop();
    console.log(`[WS] Disconnected — session ${session.sessionId}`);
  });

  ws.on('error', (err: Error) => {
    console.error('[WS] Error:', err.message);
    session.stop();
  });
}
