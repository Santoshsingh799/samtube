'use strict';

// PostgreSQL access for the SamTube account/sections system.
// Falls back gracefully: if DATABASE_URL is not set, every route that needs the
// database returns 503 with a clear setup message instead of crashing.

require('dotenv').config();
const { Pool } = require('pg');

function isConfigured() {
  return Boolean((process.env.DATABASE_URL || '').trim());
}

let pool = null;

function getPool() {
  if (!isConfigured()) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!pool) {
    const connectionString = process.env.DATABASE_URL.trim();
    // Local/dev Postgres typically has no SSL; hosted Postgres (Render, Supabase) requires it.
    const needsSsl = /sslmode=require|supabase|render\.com|neon|pooler/i.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000
    });
    pool.on('error', error => {
      console.error('[db] unexpected idle client error:', error.message);
    });
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { isConfigured, getPool, query, closePool };
