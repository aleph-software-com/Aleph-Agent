/**
 * STT Pipeline — orchestrates Silero VAD + Deepgram STT.
 *
 * Flow:
 *   1. Audio frames arrive (PCM 16-bit, 16 kHz, mono)
 *   2. Raw PCM sent to Deepgram WebSocket continuously
 *   3. PCM → Float32 → Silero VAD (local, per 512-sample window)
 *   4. Deepgram returns final transcripts → accumulated in text buffer
 *   5. Silero detects speech_end → wait flushDelayMs → flush buffer → emit 'utterance'
 *
 * Events emitted:
 *   'speech_start'                         VAD detected speech onset
 *   'speech_end'                           VAD detected end of turn
 *   'transcript_final'    { text }         Deepgram finalized a segment
 *   'utterance'           { text }         Complete user turn — ready for LLM
 */

import { EventEmitter } from 'events';
import { SileroVAD } from './vad.js';
import { DeepgramSTT } from './deepgram.js';
import type { STTPipelineConfig, TranscriptResult } from './types.js';

export class STTPipeline extends EventEmitter {
  private vad: SileroVAD;
  private deepgram: DeepgramSTT;
  private config: STTPipelineConfig;

  // Text buffer — Deepgram finals accumulate here
  private buffer = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;

  // Resampling — browser sends at native rate (48kHz), VAD needs 16kHz
  private inputSampleRate = 48000; // default, overridden by client audio_config

  constructor(config: STTPipelineConfig) {
    super();
    this.config = config;

    this.vad = new SileroVAD(config.vad);
    this.deepgram = new DeepgramSTT(config.deepgram);
  }

  // ── Lifecycle ─────────────────────────────────────────

  async start(): Promise<void> {
    await this.vad.init();

    // Wire Deepgram transcript events — finals only
    this.deepgram.on('transcript', (result: TranscriptResult) => {
      if (result.isFinal && result.transcript) {
        this.buffer += (this.buffer ? ' ' : '') + result.transcript;
        this.emit('transcript_final', { text: this.buffer });
      }
    });

    this.deepgram.on('error', (err: Error) => {
      console.error('[STT Pipeline] Deepgram error:', err.message);
      this.emit('error', err);
    });

    this.deepgram.on('close', () => {
      console.log('[STT Pipeline] Deepgram connection closed');
    });

    this.deepgram.connect();

    console.log('[STT Pipeline] Started — VAD + Deepgram ready');
  }

  stop(): void {
    this.cancelFlush();
    this.deepgram.close();
    this.vad.destroy();
    console.log('[STT Pipeline] Stopped');
  }

  // ── Audio ingestion ───────────────────────────────────

  /**
   * Set the actual sample rate from the client's AudioContext.
   * Called once after connection when client sends audio_config.
   */
  setInputSampleRate(rate: number): void {
    this.inputSampleRate = rate;
    console.log(`[STT Pipeline] Input sample rate set to ${rate} Hz`);
  }

  /**
   * Feed raw PCM 16-bit LE audio at inputSampleRate.
   * Sends to Deepgram at native rate, resamples to 16kHz for Silero VAD.
   */
  async processAudio(pcm16: Buffer): Promise<void> {
    // 1) Send raw PCM to Deepgram at native rate
    this.deepgram.send(pcm16);

    // 2) Convert to float32 + resample to 16kHz for VAD
    const float32 = pcm16ToFloat32(pcm16);
    const vadSamples = this.inputSampleRate === 16000
      ? float32
      : resample(float32, this.inputSampleRate, 16000);

    // 3) Run VAD on 16kHz samples
    const events = await this.vad.process(vadSamples);

    for (const event of events) {
      if (event === 'speech_start') {
        this.cancelFlush();
        this.emit('speech_start');
      } else if (event === 'speech_end') {
        this.emit('speech_end');
        this.scheduleFlush();
      }
    }
  }

  // ── Buffer flush logic ────────────────────────────────

  /**
   * After VAD says speech_end, wait a small grace period
   * for any trailing Deepgram finals, then flush.
   */
  private scheduleFlush(): void {
    this.cancelFlush();
    const delay = this.config.flushDelayMs ?? 200;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, delay);
  }

  private cancelFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private flush(): void {
    if (this.flushing) return;
    this.flushing = true;

    const text = this.buffer.trim();

    // Reset
    this.buffer = '';
    this.flushing = false;

    if (text) {
      console.log(`[STT Pipeline] Utterance complete: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      this.emit('utterance', { text });
    }
  }

  /** Force-flush the current buffer (e.g. on disconnect). */
  forceFlush(): void {
    this.cancelFlush();
    this.flush();
  }

}

// ── Utility ─────────────────────────────────────────────

/** PCM 16-bit signed LE → Float32 normalised to [−1, 1]. */
function pcm16ToFloat32(pcm: Buffer): Float32Array {
  const len = Math.floor(pcm.length / 2);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = pcm.readInt16LE(i * 2) / 32768;
  }
  return out;
}

/** Linear interpolation resample (e.g. 48kHz → 16kHz). */
function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = srcIdx - idx0;
    out[i] = input[idx0] * (1 - frac) + input[idx1] * frac;
  }
  return out;
}
