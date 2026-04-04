/**
 * AudioWorklet processor — buffers mic audio to ~4096 samples then posts PCM16.
 * The render quantum is 128 samples — way too small to send individually.
 * We buffer to BUFFER_SIZE (4096 at 48kHz ≈ 85ms) for a good latency/overhead balance.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = new Float32Array(4096)
    this._offset = 0
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0] || input[0].length === 0) return true

    const data = input[0]
    let pos = 0

    while (pos < data.length) {
      const remaining = 4096 - this._offset
      const toCopy = Math.min(remaining, data.length - pos)
      this._buffer.set(data.subarray(pos, pos + toCopy), this._offset)
      this._offset += toCopy
      pos += toCopy

      if (this._offset >= 4096) {
        // Convert Float32 → PCM 16-bit LE
        const pcm16 = new Int16Array(4096)
        for (let i = 0; i < 4096; i++) {
          const s = Math.max(-1, Math.min(1, this._buffer[i]))
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        this.port.postMessage(pcm16.buffer, [pcm16.buffer])
        this._offset = 0
      }
    }

    return true
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor)
