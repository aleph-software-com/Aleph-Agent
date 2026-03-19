import { Router } from 'express';
import agentsRouter from './api/agents.js';
import pipelinesRouter from './api/pipelines.js';
import chatRouter from './api/chat.js';
import apiKeysRouter from './api/apiKeys.js';
const api = Router();

// Agents
api.use('/agents', agentsRouter);

// Pipelines
api.use('/pipelines', pipelinesRouter);

// API Keys
api.use('/api-keys', apiKeysRouter);

// Chat (agent + pipeline) + Sessions
api.use('/', chatRouter);

export default api;
