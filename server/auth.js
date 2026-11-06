'use strict';

// Email + password authentication with opaque database sessions (httpOnly cookie).
// No third-party auth dependency: scrypt for hashing, sha256 for token storage.
// Google OAuth / email verification can be layered on top later without schema changes.

const crypto = require('crypto');
const db = require('./db');

const SESSION_COOKIE = 'samtube_session';
const SESSION_TTL_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/* ------------------------------- password hashing ------------------------------ */

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltHex, keyHex] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length, { N: Number(N), r: Number(r), p: Number(p) });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/* --------------------------------- sessions ---------------------------------- */

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_DAYS * 24 * 60 * 60}${secure ? '; Secure' : ''}`;
}

async function createSession(userId, userAgent) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.query(
    'INSERT INTO sessions (user_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, hashToken(token), String(userAgent || '').slice(0, 300), expires]
  );
  return { token, expires };
}

async function destroySession(token) {
  if (!token) return;
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

async function userForToken(token) {
  if (!token) return null;
  const result = await db.query(
    `SELECT u.id, u.email, u.display_name, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

function sessionTokenFromReq(req) {
  return parseCookies(req)[SESSION_COOKIE] || '';
}

/* ------------------------------- middleware ---------------------------------- */

async function attachUser(req, _res, next) {
  req.user = null;
  if (!db.isConfigured()) return next();
  try {
    req.user = await userForToken(sessionTokenFromReq(req));
  } catch (error) {
    console.warn('[auth] session lookup failed:', error.message);
  }
  next();
}

function requireAuth(req, res, next) {
  if (!db.isConfigured()) {
    return res.status(503).json({
      error: 'Database not configured. Set DATABASE_URL in .env and run `node server/migrate.js`.',
      code: 'DB_NOT_CONFIGURED'
    });
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Login required.', code: 'AUTH_REQUIRED' });
  }
  next();
}

/* -------------------------------- validators -------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 254);
}

function validateSignup({ email, password, displayName }) {
  const problems = [];
  if (!EMAIL_RE.test(email)) problems.push('Valid email required.');
  if (String(password || '').length < 8) problems.push('Password must be at least 8 characters.');
  if (String(password || '').length > 200) problems.push('Password too long.');
  if (String(displayName || '').length > 80) problems.push('Display name too long.');
  return problems;
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  userForToken,
  sessionTokenFromReq,
  parseCookies,
  cookieOptions,
  attachUser,
  requireAuth,
  normalizeEmail,
  validateSignup,
  hashToken
};
