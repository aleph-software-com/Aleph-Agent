/**
 * Unified WebSocket transport — single entry point for all chat interactions.
 *
 * Endpoint: ws://host/api/session/:agentId
 *           ws://host/api/session/pipeline/:pipelineId
 *
 * Client → Server:
 *   JSON    { type: "message", text: "..." }       Send text to LLM
 *   JSON    { type: "audio_config", sampleRate }    Set audio sample rate
 *   Binary  PCM 16-bit LE audio frames              Audio for STT
 *
 * Server → Client:
 *   JSON    All Session events as { type: "...", ...data }
 *   Binary  MP3 audio chunks from TTS
 */

import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { Session } from '../pipeline/session.js';

export function setupWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    // /api/session/:agentId
    const agentMatch = url.pathname.match(/^\/api\/session\/([a-f0-9-]+)$/);
    if (agentMatch) {
      return wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        handleConnection(ws, { agentId: agentMatch[1] });
      });
    }

    // /api/session/pipeline/:pipelineId
    const pipelineMatch = url.pathname.match(/^\/api\/session\/pipeline\/([a-f0-9-]+)$/);
    if (pipelineMatch) {
      return wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        handleConnection(ws, { pipelineId: pipelineMatch[1] });
      });
    }

    // Not ours — ignore
  });

  console.log('[WS] Handler registered on /api/session/:id');
}

// ── Per-connection handler ──────────────────────────────

async function handleConnection(
  ws: WebSocket,
  config: { agentId?: string; pipelineId?: string },
): Promise<void> {
  const send = (payload: Record<string, unknown>) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  const session = new Session(config);

  // Forward ALL session events → WebSocket
  const events = [
    'session', 'token', 'usage', 'context', 'done', 'error',
    'speech_start', 'speech_end', 'transcript_final', 'utterance',
  ];
  for (const event of events) {
    session.on(event, (data: any) => send({ type: event, ...data }));
  }
  // Debug events have their own `type` field — wrap to avoid overwriting top-level type
  session.on('debug', (data: any) => send({ type: 'debug', data }));

  // TTS audio — send as binary frames (MP3 chunks)
  session.on('audio', (chunk: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
  });

  // Start session (init layers + greeting)
  try {
    await session.start();
  } catch (err: any) {
    send({ type: 'error', error: err.message || 'Session init failed' });
    ws.close(4012, 'Session init failed');
    return;
  }

  // Handle incoming messages
  ws.on('message', async (data: Buffer | string, isBinary: boolean) => {
    if (isBinary && Buffer.isBuffer(data)) {
      // Binary = audio PCM
      try {
        await session.processAudio(data);
      } catch (err: any) {
        console.error('[WS] Audio processing error:', err.message);
      }
    } else {
      // JSON = text message or config
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'message' && msg.text) {
          await session.handleUserMessage(msg.text);
        } else if (msg.type === 'audio_config' && msg.sampleRate) {
          session.setInputSampleRate(msg.sampleRate);
        }
      } catch { /* ignore malformed */ }
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
