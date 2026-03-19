import pool from '../db.js';
import type { Agent, AgentCreate, AgentUpdate, AgentVersion, AgentVersionCreate, AgentVersionUpdate } from '../types/agents.js';
import { defaultAgentSnapshot } from '../types/agents.js';

// ── Agent CRUD ──

export async function findAll(opts?: { search?: string; cursor?: string; limit?: number }): Promise<Agent[]> {
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
    `SELECT * FROM agents ${where} ORDER BY created_at DESC LIMIT $${i}`,
    values,
  );
  return rows;
}

export async function findById(id: string): Promise<Agent | null> {
  const { rows } = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function create(data: AgentCreate): Promise<Agent> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO agents (name) VALUES ($1) RETURNING *',
      [data.name]
    );
    const agent = rows[0];
    await client.query(
      `INSERT INTO agent_versions (agent_id, version, notes, snapshot)
       VALUES ($1, 1, 'Version initiale', $2)`,
      [agent.id, JSON.stringify(defaultAgentSnapshot)]
    );
    await client.query('COMMIT');
    return agent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update(id: string, data: AgentUpdate): Promise<Agent | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name); }
  if (data.current_version !== undefined) { fields.push(`current_version = $${i++}`); values.push(data.current_version); }

  if (fields.length === 0) return findById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE agents SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM agents WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ── Agent Versions ──

export async function findVersions(agentId: string): Promise<AgentVersion[]> {
  const { rows } = await pool.query(
    'SELECT * FROM agent_versions WHERE agent_id = $1 ORDER BY version ASC',
    [agentId]
  );
  return rows;
}

export async function findVersion(agentId: string, version: number): Promise<AgentVersion | null> {
  const { rows } = await pool.query(
    'SELECT * FROM agent_versions WHERE agent_id = $1 AND version = $2',
    [agentId, version]
  );
  return rows[0] ?? null;
}

export async function createVersion(data: AgentVersionCreate): Promise<AgentVersion> {
  const { rows } = await pool.query(
    `INSERT INTO agent_versions (agent_id, version, label, notes, snapshot)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.agent_id, data.version, data.label ?? '', data.notes ?? '', JSON.stringify(data.snapshot)]
  );
  await pool.query('UPDATE agents SET current_version = $1 WHERE id = $2', [data.version, data.agent_id]);
  return rows[0];
}

export async function updateVersion(agentId: string, version: number, data: AgentVersionUpdate): Promise<AgentVersion | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.label !== undefined) { fields.push(`label = $${i++}`); values.push(data.label); }
  if (data.notes !== undefined) { fields.push(`notes = $${i++}`); values.push(data.notes); }
  if (data.snapshot !== undefined) { fields.push(`snapshot = $${i++}`); values.push(JSON.stringify(data.snapshot)); }

  if (fields.length === 0) return findVersion(agentId, version);

  values.push(agentId, version);
  const { rows } = await pool.query(
    `UPDATE agent_versions SET ${fields.join(', ')} WHERE agent_id = $${i++} AND version = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}
