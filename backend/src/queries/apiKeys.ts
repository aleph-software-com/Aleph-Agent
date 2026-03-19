import crypto from 'crypto';
import pool from '../db.js';
import type { ApiKey, ApiKeyCreate, ApiKeyUpdate } from '../types/apiKeys.js';

function generateKey(): string {
  return 'ak-' + crypto.randomBytes(24).toString('hex');
}

export async function findAll(opts?: { search?: string; cursor?: string; limit?: number }): Promise<ApiKey[]> {
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
    `SELECT * FROM api_keys ${where} ORDER BY created_at DESC LIMIT $${i}`,
    values,
  );
  return rows;
}

export async function findByAgentId(agentId: string): Promise<ApiKey[]> {
  const { rows } = await pool.query('SELECT * FROM api_keys WHERE agent_id = $1 ORDER BY created_at DESC', [agentId]);
  return rows;
}

export async function findByPipelineId(pipelineId: string): Promise<ApiKey[]> {
  const { rows } = await pool.query('SELECT * FROM api_keys WHERE pipeline_id = $1 ORDER BY created_at DESC', [pipelineId]);
  return rows;
}

export async function findByKey(key: string): Promise<ApiKey | null> {
  const { rows } = await pool.query('SELECT * FROM api_keys WHERE key = $1', [key]);
  return rows[0] || null;
}

export async function findById(id: string): Promise<ApiKey | null> {
  const { rows } = await pool.query('SELECT * FROM api_keys WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function create(data: ApiKeyCreate): Promise<ApiKey> {
  const key = generateKey();
  const { rows } = await pool.query(
    `INSERT INTO api_keys (agent_id, pipeline_id, name, key, version, rate_limit)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.agent_id || null, data.pipeline_id || null, data.name, key, data.version || null, data.rate_limit ?? 100],
  );
  return rows[0];
}

export async function update(id: string, data: ApiKeyUpdate): Promise<ApiKey | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { fields.push(`${k} = $${i++}`); values.push(v); }
  }
  if (fields.length === 0) return findById(id);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE api_keys SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values,
  );
  return rows[0] || null;
}

export async function remove(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM api_keys WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function incrementUsage(id: string): Promise<void> {
  await pool.query(
    `UPDATE api_keys SET request_count = request_count + 1, last_used_at = now() WHERE id = $1`,
    [id],
  );
}

export async function incrementSession(id: string): Promise<void> {
  await pool.query(
    `UPDATE api_keys SET session_count = session_count + 1 WHERE id = $1`,
    [id],
  );
}

export async function updateLastUsed(id: string): Promise<void> {
  await pool.query(
    `UPDATE api_keys SET last_used_at = now() WHERE id = $1`,
    [id],
  );
}
