/**
 * ElevenLabs TTS — Multi-Context WebSocket streaming.
 *
 * Single WebSocket connection for the entire session.
 * Each LLM response gets its own context_id.
 * Barge-in = close_context on current + new context_id. No reconnection.
 *
 * Events emitted:
 *   'audio'  { chunk: Buffer, contextId: string }   MP3 audio chunk
 *   'flush'  { contextId: string }                   Context audio complete
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { ElevenLabsConfig } from './types.js';

let contextCounter = 0;

export class ElevenLabsTTS extends EventEmitter {
  private ws: WebSocket | null = null;
  private connected = false;
  private currentContextId: string | null = null;

  private readonly apiKey: string;
  private readonly voiceId: string;
  private readonly modelId: string;
  private readonly outputFormat: string;
  private readonly stability: number;
  private readonly similarityBoost: number;

  constructor(config: ElevenLabsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.voiceId = config.voiceId;
    this.modelId = config.modelId ?? 'eleven_multilingual_v2';
    this.outputFormat = config.outputFormat ?? 'mp3_44100_64';
    this.stability = config.stability ?? 0.5;
    this.similarityBoost = config.similarityBoost ?? 0.75;
  }

  // ── Lifecycle ─────────────────────────────────────────

  connect(): void {
    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/multi-stream-input?model_id=${this.modelId}&output_format=${this.outputFormat}`;

    this.ws = new WebSocket(url, {
      headers: { 'xi-api-key': this.apiKey },
    });

    this.ws.on('open', () => {
      this.connected = true;
      console.log(`[ElevenLabs] Connected — voice=${this.voiceId} model=${this.modelId}`);
      this.emit('open');
    });

    this.ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.audio) {
          const chunk = Buffer.from(msg.audio, 'base64');
          const contextId = msg.contextId || msg.context_id || '';
          // Only emit if it matches the current context (ignore stale chunks)
          if (contextId === this.currentContextId) {
            this.emit('audio', chunk);
          }
        }

        if (msg.is_final && msg.contextId === this.currentContextId) {
          this.emit('flush');
        }
      } catch {
        // Ignore malformed
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.connected = false;
      console.log(`[ElevenLabs] Disconnected — code=${code} reason=${reason.toString()}`);
      this.emit('close', code, reason);
    });

    this.ws.on('error', (err: Error) => {
      console.error('[ElevenLabs] WebSocket error:', err.message);
      this.emit('error', err);
    });
  }

  close(): void {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ close_socket: true }));
      }
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
    this.currentContextId = null;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  // ── Context management ────────────────────────────────

  /** Start a new context for a new LLM response. Returns the context ID. */
  newContext(): string {
    const contextId = `ctx_${++contextCounter}_${Date.now()}`;
    this.currentContextId = contextId;

    // Send initial config for this context
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        text: ' ',
        context_id: contextId,
        voice_settings: {
          stability: this.stability,
          similarity_boost: this.similarityBoost,
        },
        generation_config: { chunk_length_schedule: [120, 160, 250, 290] },
      }));
    }

    return contextId;
  }

  /** Send text in the current context. */
  send(text: string): void {
    if (!this.ws || !this.connected || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.currentContextId) return;

    this.ws.send(JSON.stringify({
      text: text + ' ',
      context_id: this.currentContextId,
      flush: true,
    }));
  }

  /** Flush current context — signal end of text. */
  flushContext(): void {
    if (!this.ws || !this.connected || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.currentContextId) return;

    this.ws.send(JSON.stringify({
      text: '',
      context_id: this.currentContextId,
    }));
  }

  /** Close current context (barge-in). Stale audio chunks will be filtered out. */
  closeContext(): void {
    if (!this.ws || !this.connected || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.currentContextId) return;

    this.ws.send(JSON.stringify({
      context_id: this.currentContextId,
      close_context: true,
    }));

    this.currentContextId = null;
  }
}
