// ── TTS module types ───────────────────────────────────

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId?: string;        // 'eleven_multilingual_v2' (default)
  outputFormat?: string;   // 'mp3_44100_64' (default) — browser-friendly
  stability?: number;      // 0-1 (default 0.5)
  similarityBoost?: number; // 0-1 (default 0.75)
}

export interface TTSPipelineConfig {
  elevenlabs: ElevenLabsConfig;
}
