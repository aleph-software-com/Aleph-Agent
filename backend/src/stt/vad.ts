/**
 * Silero VAD — direct onnxruntime-node, zero wrapper.
 *
 * Loads silero_vad.onnx (v4 or v5), feeds 512-sample frames at 16 kHz,
 * and runs a simple state machine: idle → speaking → silence → speech_end.
 *
 * Auto-detects model version from ONNX input names:
 *   v5  →  inputs: input, state, sr          (state shape [2,1,128])
 *   v4  →  inputs: input, h, c, sr           (h/c shape   [2,1,64])
 */

import * as ort from 'onnxruntime-node';
import type { VADConfig, VADEvent, VADFrameResult } from './types.js';

const SAMPLE_RATE = 16000;
const WINDOW_SIZE = 512; // 32 ms at 16 kHz — required by Silero

type ModelVersion = 'v5' | 'v4';

export class SileroVAD {
  private session: ort.InferenceSession | null = null;
  private version: ModelVersion = 'v5';

  // LSTM state — shape depends on model version
  private state: ort.Tensor | null = null;  // v5: combined [2,1,128]
  private h: ort.Tensor | null = null;      // v4: hidden   [2,1,64]
  private c: ort.Tensor | null = null;      // v4: cell     [2,1,64]

  // State machine
  private phase: 'idle' | 'speaking' | 'silence' = 'idle';
  private silenceFrames = 0;
  private speechFrames = 0;

  // Pre-computed thresholds (in frames)
  private readonly silenceFrameThreshold: number;
  private readonly minSpeechFrameThreshold: number;

  // Internal buffer for partial frames
  private remainder = new Float32Array(WINDOW_SIZE);
  private remainderLen = 0;

  // Config (all defaults applied)
  private readonly threshold: number;
  private readonly modelPath: string;

  constructor(config: VADConfig) {
    this.modelPath = config.modelPath;
    this.threshold = config.threshold ?? 0.5;

    const frameMs = (WINDOW_SIZE / SAMPLE_RATE) * 1000; // ≈ 32 ms
    this.silenceFrameThreshold = Math.ceil((config.minSilenceDurationMs ?? 500) / frameMs);
    this.minSpeechFrameThreshold = Math.ceil((config.minSpeechDurationMs ?? 250) / frameMs);
  }

  // ── Lifecycle ─────────────────────────────────────────

  async init(): Promise<void> {
    this.session = await ort.InferenceSession.create(this.modelPath);
    const names = this.session.inputNames;

    if (names.includes('state')) {
      this.version = 'v5';
      this.state = new ort.Tensor('float32', new Float32Array(2 * 1 * 128), [2, 1, 128]);
    } else {
      this.version = 'v4';
      this.h = new ort.Tensor('float32', new Float32Array(2 * 1 * 64), [2, 1, 64]);
      this.c = new ort.Tensor('float32', new Float32Array(2 * 1 * 64), [2, 1, 64]);
    }

    console.log(`[VAD] Silero ${this.version} loaded — threshold ${this.threshold}, silence ${this.silenceFrameThreshold} frames, min-speech ${this.minSpeechFrameThreshold} frames`);
  }

  reset(): void {
    if (this.version === 'v5') {
      this.state = new ort.Tensor('float32', new Float32Array(2 * 1 * 128), [2, 1, 128]);
    } else {
      this.h = new ort.Tensor('float32', new Float32Array(2 * 1 * 64), [2, 1, 64]);
      this.c = new ort.Tensor('float32', new Float32Array(2 * 1 * 64), [2, 1, 64]);
    }
    this.phase = 'idle';
    this.silenceFrames = 0;
    this.speechFrames = 0;
    this.remainderLen = 0;
  }

  destroy(): void {
    this.session?.release();
    this.session = null;
  }

  // ── Public API ────────────────────────────────────────

  /**
   * Feed arbitrary-length Float32 audio (normalized −1…1, 16 kHz).
   * Internally buffers to 512-sample windows.
   * Returns any VAD events emitted during processing.
   */
  async process(samples: Float32Array): Promise<VADEvent[]> {
    const events: VADEvent[] = [];
    let offset = 0;

    // Fill remainder from previous call
    if (this.remainderLen > 0) {
      const needed = WINDOW_SIZE - this.remainderLen;
      const available = Math.min(needed, samples.length);
      this.remainder.set(samples.subarray(0, available), this.remainderLen);
      this.remainderLen += available;
      offset = available;

      if (this.remainderLen === WINDOW_SIZE) {
        const r = await this.processFrame(this.remainder);
        if (r.event) events.push(r.event);
        this.remainderLen = 0;
      }
    }

    // Full frames
    while (offset + WINDOW_SIZE <= samples.length) {
      const frame = samples.subarray(offset, offset + WINDOW_SIZE);
      const r = await this.processFrame(frame);
      if (r.event) events.push(r.event);
      offset += WINDOW_SIZE;
    }

    // Stash leftovers
    if (offset < samples.length) {
      const leftover = samples.subarray(offset);
      this.remainder.set(leftover, 0);
      this.remainderLen = leftover.length;
    }

    return events;
  }

  // ── Internal ──────────────────────────────────────────

  private async processFrame(frame: Float32Array): Promise<VADFrameResult> {
    if (!this.session) throw new Error('VAD not initialised — call init() first');

    const input = new ort.Tensor('float32', frame, [1, WINDOW_SIZE]);
    const sr = new ort.Tensor('int64', BigInt64Array.from([BigInt(SAMPLE_RATE)]), [1]);

    let results: ort.InferenceSession.OnnxValueMapType;

    if (this.version === 'v5') {
      results = await this.session.run({ input, state: this.state!, sr });
      this.state = results.stateN as ort.Tensor;
    } else {
      results = await this.session.run({ input, h: this.h!, c: this.c!, sr });
      this.h = results.hn as ort.Tensor;
      this.c = results.cn as ort.Tensor;
    }

    const probability = (results.output.data as Float32Array)[0];
    const event = this.updateStateMachine(probability);

    return { probability, event };
  }

  private updateStateMachine(prob: number): VADEvent | null {
    if (prob >= this.threshold) {
      // ── Speech detected ──
      this.silenceFrames = 0;
      this.speechFrames++;

      if (this.phase === 'idle' && this.speechFrames >= this.minSpeechFrameThreshold) {
        this.phase = 'speaking';
        return 'speech_start';
      }
      if (this.phase === 'silence') {
        // False alarm — resume speaking
        this.phase = 'speaking';
      }
      return null;
    }

    // ── Silence detected ──
    if (this.phase === 'speaking') {
      this.phase = 'silence';
      this.silenceFrames = 1;
    } else if (this.phase === 'silence') {
      this.silenceFrames++;
      if (this.silenceFrames >= this.silenceFrameThreshold) {
        this.phase = 'idle';
        this.speechFrames = 0;
        this.silenceFrames = 0;
        return 'speech_end';
      }
    } else {
      // idle — noise spike too short, reset
      this.speechFrames = 0;
    }
    return null;
  }
}
