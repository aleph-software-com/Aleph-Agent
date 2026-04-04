// ── STT module types ───────────────────────────────────

export interface VADConfig {
  modelPath: string;
  threshold?: number;            // Speech probability threshold (default 0.5)
  minSilenceDurationMs?: number; // Silence to trigger end-of-turn (default 500)
  minSpeechDurationMs?: number;  // Min speech to consider valid (default 250)
}

export interface DeepgramConfig {
  apiKey: string;
  model?: string;       // 'nova-2' | 'nova-3' (default 'nova-2')
  language?: string;     // BCP-47 (default 'fr')
  endpointing?: number;  // ms — set low, VAD handles turn detection (default 25)
  sampleRate?: number;
  channels?: number;
}

export interface STTPipelineConfig {
  vad: VADConfig;
  deepgram: DeepgramConfig;
  flushDelayMs?: number; // Grace period after VAD speech_end before flushing (default 200)
}

export interface TranscriptResult {
  transcript: string;
  isFinal: boolean;
}

export type VADEvent = 'speech_start' | 'speech_end';

export interface VADFrameResult {
  probability: number;
  event: VADEvent | null;
}
