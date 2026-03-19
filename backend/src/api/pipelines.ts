import { Router } from 'express';
import * as pipelinesQ from '../queries/pipelines.js';

const router = Router({ mergeParams: true });

// GET /api/pipelines?search=&cursor=&limit=
router.get('/', async (req, res) => {
  const { search, cursor, limit } = req.query as any;
  const pipelines = await pipelinesQ.findAll({
    search: search || undefined,
    cursor: cursor || undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json(pipelines);
});

// GET /api/pipelines/:id
router.get('/:id', async (req, res) => {
  const pipeline = await pipelinesQ.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
  res.json(pipeline);
});

// GET /api/pipelines/:id/full — pipeline + current version snapshot (tools inside) + versions list
router.get('/:id/full', async (req, res) => {
  const pipeline = await pipelinesQ.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });

  const [version, versions] = await Promise.all([
    pipelinesQ.findVersion(pipeline.id, pipeline.current_version),
    pipelinesQ.findVersions(pipeline.id),
  ]);

  const snapshot = version?.snapshot ?? {};
  res.json({ ...pipeline, ...snapshot, versions });
});

// POST /api/pipelines
router.post('/', async (req, res) => {
  const pipeline = await pipelinesQ.create(req.body);
  res.status(201).json(pipeline);
});

// PATCH /api/pipelines/:id
router.patch('/:id', async (req, res) => {
  const pipeline = await pipelinesQ.update(req.params.id, req.body);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
  res.json(pipeline);
});

// DELETE /api/pipelines/:id
router.delete('/:id', async (req, res) => {
  const deleted = await pipelinesQ.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Pipeline not found' });
  res.status(204).end();
});

// ── Version endpoints ──

// GET /api/pipelines/:id/versions
router.get('/:id/versions', async (req, res) => {
  const versions = await pipelinesQ.findVersions(req.params.id);
  res.json(versions);
});

// GET /api/pipelines/:id/versions/:version
router.get('/:id/versions/:version', async (req, res) => {
  const version = await pipelinesQ.findVersion(req.params.id, Number(req.params.version));
  if (!version) return res.status(404).json({ error: 'Version not found' });
  res.json(version);
});

// POST /api/pipelines/:id/versions
router.post('/:id/versions', async (req, res) => {
  const pipeline = await pipelinesQ.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });

  const versions = await pipelinesQ.findVersions(pipeline.id);
  const nextVersion = versions.length + 1;

  const version = await pipelinesQ.createVersion({
    pipeline_id: pipeline.id,
    version: nextVersion,
    label: req.body.label ?? '',
    notes: req.body.notes ?? '',
    snapshot: req.body.snapshot,
  });
  res.status(201).json(version);
});

// PATCH /api/pipelines/:id/versions/:version
router.patch('/:id/versions/:version', async (req, res) => {
  const version = await pipelinesQ.updateVersion(req.params.id, Number(req.params.version), req.body);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  res.json(version);
});

// POST /api/pipelines/:id/switch/:version
router.post('/:id/switch/:version', async (req, res) => {
  const versionNum = Number(req.params.version);
  const version = await pipelinesQ.findVersion(req.params.id, versionNum);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  const pipeline = await pipelinesQ.update(req.params.id, { current_version: versionNum });
  res.json(pipeline);
});

export default router;
