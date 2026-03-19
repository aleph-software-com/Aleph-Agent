import pool from '../db.js';
import type { Pipeline, PipelineCreate, PipelineUpdate, PipelineVersion, PipelineVersionCreate, PipelineVersionUpdate } from '../types/pipelines.js';
import { defaultPipelineSnapshot } from '../types/pipelines.js';

// ── Pipeline CRUD ──

export async function findAll(opts?: { search?: string; cursor?: string; limit?: number }): Promise<Pipeline[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (opts?.search) {
    conditions.push(`name ILIKE $${i++}`);
    values.push(`%${opts.search}%`);
  }
  if (opts?.cursor) {
    conditions.push(`created_at < $${i++}`);
    values.push(opts.cursor);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts?.limit ?? 20;
  values.push(limit);

  const { rows } = await pool.query(
    `SELECT * FROM pipelines ${where} ORDER BY created_at DESC LIMIT $${i}`,
    values,
  );
  return rows;
}

export async function findById(id: string): Promise<Pipeline | null> {
  const { rows } = await pool.query('SELECT * FROM pipelines WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function create(data: PipelineCreate): Promise<Pipeline> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO pipelines (name) VALUES ($1) RETURNING *',
      [data.name]
    );
    const pipeline = rows[0];
    await client.query(
      `INSERT INTO pipeline_versions (pipeline_id, version, notes, snapshot)
       VALUES ($1, 1, 'Version initiale', $2)`,
      [pipeline.id, JSON.stringify(defaultPipelineSnapshot)]
    );
    await client.query('COMMIT');
    return pipeline;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update(id: string, data: PipelineUpdate): Promise<Pipeline | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name); }
  if (data.current_version !== undefined) { fields.push(`current_version = $${i++}`); values.push(data.current_version); }

  if (fields.length === 0) return findById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE pipelines SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM pipelines WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ── Pipeline Versions ──

export async function findVersions(pipelineId: string): Promise<PipelineVersion[]> {
  const { rows } = await pool.query(
    'SELECT * FROM pipeline_versions WHERE pipeline_id = $1 ORDER BY version ASC',
    [pipelineId]
  );
  return rows;
}

export async function findVersion(pipelineId: string, version: number): Promise<PipelineVersion | null> {
  const { rows } = await pool.query(
    'SELECT * FROM pipeline_versions WHERE pipeline_id = $1 AND version = $2',
    [pipelineId, version]
  );
  return rows[0] ?? null;
}

export async function createVersion(data: PipelineVersionCreate): Promise<PipelineVersion> {
  const { rows } = await pool.query(
    `INSERT INTO pipeline_versions (pipeline_id, version, label, notes, snapshot)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.pipeline_id, data.version, data.label ?? '', data.notes ?? '', JSON.stringify(data.snapshot)]
  );
  await pool.query('UPDATE pipelines SET current_version = $1 WHERE id = $2', [data.version, data.pipeline_id]);
  return rows[0];
}

export async function updateVersion(pipelineId: string, version: number, data: PipelineVersionUpdate): Promise<PipelineVersion | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.label !== undefined) { fields.push(`label = $${i++}`); values.push(data.label); }
  if (data.notes !== undefined) { fields.push(`notes = $${i++}`); values.push(data.notes); }
  if (data.snapshot !== undefined) { fields.push(`snapshot = $${i++}`); values.push(JSON.stringify(data.snapshot)); }

  if (fields.length === 0) return findVersion(pipelineId, version);

  values.push(pipelineId, version);
  const { rows } = await pool.query(
    `UPDATE pipeline_versions SET ${fields.join(', ')} WHERE pipeline_id = $${i++} AND version = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}
