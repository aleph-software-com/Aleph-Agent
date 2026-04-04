FROM node:20-slim

WORKDIR /app

# onnxruntime-node needs native libs (glibc-based, not Alpine)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

# Download Silero VAD v4 model (v5 ONNX is broken with onnxruntime-node)
RUN mkdir -p models && \
    curl -L -o models/silero_vad.onnx \
    https://github.com/snakers4/silero-vad/raw/v4.0/files/silero_vad.onnx

EXPOSE 3001

CMD ["npx", "tsx", "src/server.ts"]
