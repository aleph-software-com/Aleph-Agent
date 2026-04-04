#!/usr/bin/env bash
# Download Silero VAD v4 ONNX model (v5 is broken with onnxruntime-node).
# Run once: bash scripts/download-vad-model.sh

set -euo pipefail

MODEL_DIR="$(cd "$(dirname "$0")/.." && pwd)/models"
MODEL_PATH="$MODEL_DIR/silero_vad.onnx"
URL="https://github.com/snakers4/silero-vad/raw/v4.0/files/silero_vad.onnx"

mkdir -p "$MODEL_DIR"

if [ -f "$MODEL_PATH" ]; then
  echo "Model already exists at $MODEL_PATH"
  exit 0
fi

echo "Downloading Silero VAD v4 model..."
curl -L -o "$MODEL_PATH" "$URL"
echo "Saved to $MODEL_PATH"
