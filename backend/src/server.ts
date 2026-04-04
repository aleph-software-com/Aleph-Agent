import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import api from './router.js';
import { setupWebSocket } from './api/ws.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// REST routes
app.use('/api', api);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// HTTP server + WebSocket
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
