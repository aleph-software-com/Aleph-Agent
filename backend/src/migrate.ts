import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, 'migration.sql'), 'utf-8');
const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf-8');

async function migrate() {
  console.log('Running migration...');
  await pool.query(sql);
  console.log('Migration complete — 13 tables created.');
  console.log('Running seed...');
  await pool.query(seed);
  console.log('Seed complete — default org created.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
