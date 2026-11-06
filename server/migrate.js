'use strict';

// Applies server/migrations/*.sql in filename order, tracked in schema_migrations.
// Usage: node server/migrate.js   (idempotent — safe to re-run)

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const db = require('./db');

async function main() {
  if (!db.isConfigured()) {
    console.error('DATABASE_URL is not set. Copy .env.example values or export DATABASE_URL first.');
    process.exit(1);
  }
  const client = await db.getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const appliedRows = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRows.rows.map(row => row.filename));

    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }
      console.log(`apply ${file} ...`);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`ok    ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`fail  ${file}: ${error.message}`);
        process.exitCode = 1;
        return;
      }
    }
    console.log('migrations done');
  } finally {
    client.release();
    await db.closePool();
  }
}

main().catch(error => {
  console.error('migrate failed:', error);
  process.exit(1);
});
