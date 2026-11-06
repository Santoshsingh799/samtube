'use strict';

// /api/auth — signup, login, logout, me. Opaque DB sessions + httpOnly cookie.

const express = require('express');
const db = require('./db');
const auth = require('./auth');

const router = express.Router();

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 30;

function authLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip) || { start: now, count: 0 };
  if (now - entry.start > WINDOW_MS) {
    entry.start = now;
    entry.count = 0;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  if (attempts.size > 5000) attempts.clear();
  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts — thodi der baad try karo.', code: 'AUTH_RATE_LIMITED' });
  }
  next();
}

function publicUser(row) {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${auth.SESSION_COOKIE}=${encodeURIComponent(token)}; ${auth.cookieOptions()}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${auth.SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured.', code: 'DB_NOT_CONFIGURED' });
    }
    const email = auth.normalizeEmail(req.body?.email);
    const displayName = String(req.body?.displayName ?? req.body?.name ?? '').trim().slice(0, 80);
    const password = String(req.body?.password || '');
    const problems = auth.validateSignup({ email, password, displayName });
    if (problems.length) {
      return res.status(400).json({ error: problems.join(' '), code: 'INVALID_SIGNUP' });
    }
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'Is email ka account pehle se hai. Login karo.', code: 'EMAIL_TAKEN' });
    }
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name, role',
      [email, auth.hashPassword(password), displayName || email.split('@')[0]]
    );
    const user = rows[0];
    const { token } = await auth.createSession(user.id, req.headers['user-agent']);
    setSessionCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured.', code: 'DB_NOT_CONFIGURED' });
    }
    const email = auth.normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !auth.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email ya password galat hai.', code: 'INVALID_CREDENTIALS' });
    }
    const { token } = await auth.createSession(user.id, req.headers['user-agent']);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = auth.sessionTokenFromReq(req);
    await auth.destroySession(token);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req, res) => {
  res.json({ user: req.user || null, authenticated: Boolean(req.user) });
});

module.exports = router;
