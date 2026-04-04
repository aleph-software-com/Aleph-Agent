/**
 * TTS Pipeline — orchestrates sentence splitting + ElevenLabs multi-context streaming.
 *
 * Flow:
 *   1. beginResponse() — opens a new ElevenLabs context
 *   2. LLM tokens arrive via pushToken()
 *   3. SentenceSplitter accumulates → emits complete sentences
 *   4. ElevenLabs converts sentence → streams MP3 audio chunks
 *   5. finishResponse() — flushes remaining text
 *   6. interrupt() — closes context (barge-in), stale audio is filtered
 *
 * Events emitted:
 *   'audio'    Buffer      MP3 audio chunk
 *   'flush'                All audio for current response done
 */

import { EventEmitter } from 'events';
import { SentenceSplitter } from './sentence-splitter.js';
import { ElevenLabsTTS } from './elevenlabs.js';
import type { TTSPipelineConfig } from './types.js';

export class TTSPipeline extends EventEmitter {
  private splitter: SentenceSplitter;
  private elevenlabs: ElevenLabsTTS;

  constructor(config: TTSPipelineConfig) {
    super();
    this.splitter = new SentenceSplitter();
    this.elevenlabs = new ElevenLabsTTS(config.elevenlabs);
  }

  async start(): Promise<void> {
    // Wire splitter → ElevenLabs
    this.splitter.on('sentence', (sentence: string) => {
      this.elevenlabs.send(sentence);
    });

    this.splitter.on('flush', () => {
      this.elevenlabs.flushContext();
    });

    // Wire ElevenLabs → output
    this.elevenlabs.on('audio', (chunk: Buffer) => {
      this.emit('audio', chunk);
    });

    this.elevenlabs.on('flush', () => {
      this.emit('flush');
    });

    this.elevenlabs.on('error', (err: Error) => {
      console.error('[TTS Pipeline] ElevenLabs error:', err.message);
      this.emit('error', err);
    });

    this.elevenlabs.connect();
    console.log('[TTS Pipeline] Started');
  }

  stop(): void {
    this.splitter.clear();
    this.elevenlabs.close();
    console.log('[TTS Pipeline] Stopped');
  }

  /** Start a new context for a new LLM response. */
  beginResponse(): void {
    this.splitter.clear();
    this.elevenlabs.newContext();
  }

  /** Feed a single token from LLM streaming. */
  pushToken(token: string): void {
    this.splitter.push(token);
  }

  /** Signal end of LLM response — flush remaining text. */
  finishResponse(): void {
    this.splitter.flush();
  }

  /** Barge-in — close current context, clear pending text. No reconnection. */
  interrupt(): void {
    this.splitter.clear();
    this.elevenlabs.closeContext();
  }
}
