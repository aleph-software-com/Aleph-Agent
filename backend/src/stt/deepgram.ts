/**
 * Deepgram live STT — WebSocket streaming.
 *
 * Best practices applied:
 *   - endpointing 25 ms     (ultra-fast finalization, VAD handles turn detection)
 *   - no smart_format        (avoid extra processing latency — LLM handles formatting)
 *   - no interim_results     (only finals — VAD handles turn boundary, interims are noise)
 *   - KeepAlive every 8 s   (prevents idle disconnect)
 *   - Graceful close via CloseStream message
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { DeepgramConfig, TranscriptResult } from './types.js';

const KEEPALIVE_INTERVAL_MS = 8_000;

export class DeepgramSTT extends EventEmitter {
  private ws: WebSocket | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly language: string;
  private readonly endpointing: number;
  private readonly sampleRate: number;
  private readonly channels: number;
  private readonly encoding: string;

  constructor(config: DeepgramConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'nova-2';
    this.language = config.language ?? 'fr';
    this.endpointing = config.endpointing ?? 25;
    this.sampleRate = config.sampleRate ?? 16000;
    this.channels = config.channels ?? 1;
    this.encoding = config.encoding ?? 'linear16';
  }

  // ── Lifecycle ─────────────────────────────────────────

  connect(): void {
    const params = new URLSearchParams({
      model: this.model,
      endpointing: String(this.endpointing),
      smart_format: 'false',
      interim_results: 'false',
      encoding: this.encoding,
      sample_rate: String(this.sampleRate),
      channels: String(this.channels),
      punctuate: 'false',
      vad_events: 'true',
    });

    // "multi" → auto-detect language; anything else → explicit language code
    if (this.language === 'multi') {
      params.set('detect_language', 'true');
    } else {
      params.set('language', this.language);
    }

    const url = `wss://api.deepgram.com/v1/listen?${params}`;
    console.log(`[Deepgram] Connecting to: ${url.replace(/Token [^ ]+/, 'Token ***')}`);

    this.ws = new WebSocket(url, {
      headers: { Authorization: `Token ${this.apiKey}` },
    });

    this.ws.on('open', () => {
      this.connected = true;
      this.startKeepAlive();
      console.log(`[Deepgram] Connected — model=${this.model} lang=${this.language} encoding=${this.encoding} sampleRate=${this.sampleRate} endpointing=${this.endpointing}ms`);
      this.emit('open');
    });

    this.ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'Results') {
          const alt = msg.channel?.alternatives?.[0];
          console.log(`[DEBUG][Deepgram] Results — is_final=${msg.is_final} transcript="${alt?.transcript ?? ''}"`);
          if (alt && alt.transcript) {
            const result: TranscriptResult = {
              transcript: alt.transcript,
              isFinal: !!msg.is_final,
            };
            this.emit('transcript', result);
          }
        } else if (msg.type === 'UtteranceEnd') {
          console.log(`[DEBUG][Deepgram] UtteranceEnd received`);
          this.emit('utterance_end');
        } else if (msg.type === 'SpeechStarted') {
          console.log(`[DEBUG][Deepgram] SpeechStarted received`);
          this.emit('deepgram_speech_started');
        } else if (msg.type === 'Metadata') {
          console.log(`[DEBUG][Deepgram] Metadata:`, JSON.stringify(msg));
        } else if (msg.type === 'Error') {
          console.error(`[DEBUG][Deepgram] Error from server:`, JSON.stringify(msg));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.connected = false;
      this.stopKeepAlive();
      console.log(`[Deepgram] Disconnected — code=${code} reason=${reason.toString()}`);
      this.emit('close', code, reason);
    });

    this.ws.on('unexpected-response', (_req: any, res: any) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => {
        console.error(`[Deepgram] Rejected ${res.statusCode}: ${body}`);
        this.emit('error', new Error(`Deepgram ${res.statusCode}: ${body}`));
      });
    });

    this.ws.on('error', (err: Error) => {
      console.error('[Deepgram] WebSocket error:', err.message);
      this.emit('error', err);
    });
  }

  /** Send raw PCM16 audio to Deepgram. */
  private _sendCount = 0;
  send(pcmChunk: Buffer): void {
    if (this.ws && this.connected && this.ws.readyState === WebSocket.OPEN) {
      this._sendCount++;
      if (this._sendCount === 1 || this._sendCount % 200 === 0)
        console.log(`[DEBUG][Deepgram] Sending chunk #${this._sendCount} — ${pcmChunk.length} bytes`);
      this.ws.send(pcmChunk);
    } else {
      if (this._sendCount === 0 || this._sendCount % 50 === 0)
        console.warn(`[DEBUG][Deepgram] send() called but NOT connected — connected=${this.connected} readyState=${this.ws?.readyState}`);
      this._sendCount++;
    }
  }

  /** Graceful shutdown per Deepgram protocol. */
  close(): void {
    this.stopKeepAlive();
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      }
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  // ── KeepAlive ─────────────────────────────────────────

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}
