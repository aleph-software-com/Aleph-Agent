/**
 * Sentence splitter — accumulates LLM tokens and emits complete sentences.
 *
 * Splits on sentence-ending punctuation (. ! ? … ; :) followed by a space or end.
 * Designed for streaming: feed tokens one at a time, get sentences out.
 */

import { EventEmitter } from 'events';

// Sentence-ending punctuation followed by space or end of input
const SENTENCE_END = /[.!?…;:]\s/;

export class SentenceSplitter extends EventEmitter {
  private buffer = '';

  /** Feed a token (partial text from LLM streaming). */
  push(token: string): void {
    this.buffer += token;

    // Try to extract complete sentences
    let match: RegExpExecArray | null;
    while ((match = SENTENCE_END.exec(this.buffer)) !== null) {
      const splitIdx = match.index + match[0].length;
      const sentence = this.buffer.slice(0, splitIdx).trim();
      this.buffer = this.buffer.slice(splitIdx);

      if (sentence) {
        this.emit('sentence', sentence);
      }
    }
  }

  /** Flush remaining buffer (call when LLM is done). */
  flush(): void {
    const remaining = this.buffer.trim();
    this.buffer = '';
    if (remaining) {
      this.emit('sentence', remaining);
    }
    this.emit('flush');
  }

  /** Clear buffer without emitting (call on barge-in). */
  clear(): void {
    this.buffer = '';
  }
}
