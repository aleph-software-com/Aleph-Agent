import { Router } from 'express';
import * as agentsQ from '../queries/agents.js';
import { encrypt } from '../utils/crypto.js';

const router = Router({ mergeParams: true });

// POST /api/agents/encrypt-key — encrypt an API key, return encrypted blob + hint
router.post('/encrypt-key', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required' });
  const encrypted = encrypt(key);
  const hint = key.slice(-4);
  res.json({ encrypted, hint });
});

// GET /api/agents?search=&cursor=&limit=
router.get('/', async (req, res) => {
  const { search, cursor, limit } = req.query as any;
  const agents = await agentsQ.findAll({
    search: search || undefined,
    cursor: cursor || undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json(agents);
});

// GET /api/agents/:id
router.get('/:id', async (req, res) => {
  const agent = await agentsQ.findById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// GET /api/agents/:id/full — agent + current version snapshot (tasks/tools inside) + versions list
router.get('/:id/full', async (req, res) => {
  const agent = await agentsQ.findById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const [version, versions] = await Promise.all([
    agentsQ.findVersion(agent.id, agent.current_version),
    agentsQ.findVersions(agent.id),
  ]);

  const snapshot = version?.snapshot ?? {};
  res.json({ ...agent, ...snapshot, versions });
});

// POST /api/agents
router.post('/', async (req, res) => {
  const agent = await agentsQ.create(req.body);
  res.status(201).json(agent);
});

// PATCH /api/agents/:id
router.patch('/:id', async (req, res) => {
  const agent = await agentsQ.update(req.params.id, req.body);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// DELETE /api/agents/:id
router.delete('/:id', async (req, res) => {
  const deleted = await agentsQ.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Agent not found' });
  res.status(204).end();
});

// ── Version endpoints ──

// GET /api/agents/:id/versions
router.get('/:id/versions', async (req, res) => {
  const versions = await agentsQ.findVersions(req.params.id);
  res.json(versions);
});

// GET /api/agents/:id/versions/:version
router.get('/:id/versions/:version', async (req, res) => {
  const version = await agentsQ.findVersion(req.params.id, Number(req.params.version));
  if (!version) return res.status(404).json({ error: 'Version not found' });
  res.json(version);
});

// POST /api/agents/:id/versions — create a new version
router.post('/:id/versions', async (req, res) => {
  const agent = await agentsQ.findById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const versions = await agentsQ.findVersions(agent.id);
  const nextVersion = versions.length + 1;

  const version = await agentsQ.createVersion({
    agent_id: agent.id,
    version: nextVersion,
    label: req.body.label ?? '',
    notes: req.body.notes ?? '',
    snapshot: req.body.snapshot,
  });
  res.status(201).json(version);
});

// PATCH /api/agents/:id/versions/:version — update version metadata or snapshot
router.patch('/:id/versions/:version', async (req, res) => {
  const version = await agentsQ.updateVersion(req.params.id, Number(req.params.version), req.body);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  res.json(version);
});

// POST /api/agents/:id/switch/:version — switch to a specific version
router.post('/:id/switch/:version', async (req, res) => {
  const versionNum = Number(req.params.version);
  const version = await agentsQ.findVersion(req.params.id, versionNum);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  const agent = await agentsQ.update(req.params.id, { current_version: versionNum });
  res.json(agent);
});

export default router;
