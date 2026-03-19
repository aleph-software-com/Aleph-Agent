import { Router } from 'express';
import * as apiKeysQ from '../queries/apiKeys.js';

const router = Router();

function maskKey(key: string): string {
  return key.slice(0, 7) + '...' + key.slice(-4);
}

// GET /api/api-keys?search=&cursor=&limit=
router.get('/', async (req, res) => {
  const { search, cursor, limit } = req.query as any;
  const keys = await apiKeysQ.findAll({
    search: search || undefined,
    cursor: cursor || undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json(keys.map((k) => ({ ...k, key: maskKey(k.key) })));
});

// GET /api/api-keys/agent/:agentId
router.get('/agent/:agentId', async (req, res) => {
  const keys = await apiKeysQ.findByAgentId(req.params.agentId);
  res.json(keys.map((k) => ({ ...k, key: maskKey(k.key) })));
});

// GET /api/api-keys/pipeline/:pipelineId
router.get('/pipeline/:pipelineId', async (req, res) => {
  const keys = await apiKeysQ.findByPipelineId(req.params.pipelineId);
  res.json(keys.map((k) => ({ ...k, key: maskKey(k.key) })));
});

// POST /api/api-keys — returns FULL key (only time visible)
router.post('/', async (req, res) => {
  const apiKey = await apiKeysQ.create(req.body);
  res.status(201).json(apiKey); // full key returned
});

// PATCH /api/api-keys/:id
router.patch('/:id', async (req, res) => {
  const updated = await apiKeysQ.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'API key not found' });
  res.json({ ...updated, key: maskKey(updated.key) });
});

// DELETE /api/api-keys/:id
router.delete('/:id', async (req, res) => {
  const deleted = await apiKeysQ.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'API key not found' });
  res.status(204).end();
});

export default router;
