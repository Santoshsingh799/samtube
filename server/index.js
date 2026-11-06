'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const youtube = require('./youtube');
const auth = require('./auth');
const authRoutes = require('./authRoutes');
const sectionsRouter = require('./sections');
const { runMigrations } = require('./migrate');

const db = require('./db');

function dbStatus() {
  return db.isConfigured() ? 'configured' : 'not-configured';
}

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    }
  })
);
app.use(express.json({ limit: '100kb' }));

/* --------------------------- basic rate limiting -------------------------- */

const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 600; // single-user app: generous, only stops abusive loops

app.use('/api', (req, res, next) => {
  // Health polling must never be blocked — it's how the UI shows server status.
  if (req.path === '/health') return next();

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
  } else {
    entry.count += 1;
    if (entry.count > MAX_REQUESTS) {
      const retryAfter = Math.ceil((entry.start + WINDOW_MS - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({
        error: 'Thoda wait karo — server busy hai. 10 second baad Try again dabao.',
        code: 'RATE_LIMITED'
      });
    }
  }
  if (hits.size > 5000) hits.clear();
  next();
});

/* --------------------------------- routes -------------------------------- */

app.use('/api', auth.attachUser);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'SamTube API',
    mode: youtube.mode(),
    hasApiKey: youtube.hasApiKey(),
    officialApi: youtube.officialStatus(),
    db: dbStatus(),
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', sectionsRouter);

app.get('/api/videos', async (req, res, next) => {
  try {
    const result = await youtube.searchVideos({
      q: req.query.q,
      language: req.query.language,
      category: req.query.category,
      pageToken: typeof req.query.pageToken === 'string' ? req.query.pageToken : '',
      limit: req.query.limit,
      sort: req.query.sort,
      topic: req.query.topic
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/video/:id', async (req, res, next) => {
  try {
    const video = await youtube.getVideo(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found or unavailable.' });
    res.json({ video, mode: youtube.mode() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/related/:id', async (req, res, next) => {
  try {
    const result = await youtube.relatedVideos({
      id: req.params.id,
      title: req.query.title,
      channel: req.query.channel,
      language: req.query.language,
      limit: req.query.limit,
      topic: req.query.topic
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/suggest', async (req, res, next) => {
  try {
    const suggestions = await youtube.suggestions({
      q: req.query.q,
      language: req.query.language,
      topic: req.query.topic
    });
    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

/* ------------------------- production static client ---------------------- */

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res.status(200).send(
      '<h1>SamTube API</h1><p>API is running. Start the client with <code>npm run dev</code> or build it with <code>npm run build</code>.</p>'
    )
  );
}

/* ------------------------------ error handler ---------------------------- */

app.use((error, _req, res, _next) => {
  const message = String(error?.message || '');
  // Database connectivity/auth problems: say exactly what to check instead of a raw 500.
  const isDbProblem =
    /password authentication failed|connection refused|ECONNREFUSED|does not exist|ENOTFOUND|timeout|too many clients/i.test(message) ||
    error?.code === '28P01' || error?.code === '3D000' || error?.code === 'ECONNREFUSED';
  if (isDbProblem) {
    console.error('[db]', message);
    return res.status(503).json({
      error: 'Database connection fail ho gaya. Check karo: (1) .env me DATABASE_URL ka password sahi hai? (2) samtube database pgAdmin me bana hai? (3) `node server/migrate.js` run kiya? Phir server restart karo.',
      code: 'DB_UNAVAILABLE'
    });
  }
  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) console.error('[api]', error.message);
  res.status(status).json({
    error: error.message || 'Something went wrong while talking to YouTube.',
    code: error.code || 'SERVER_ERROR'
  });
});

let server;

async function start() {
  if (db.isConfigured()) {
    console.log('[db] applying migrations...');
    await runMigrations();
  }
  server = app.listen(PORT, () => {
    const mode = youtube.hasApiKey() ? 'YouTube Data API key detected' : 'no API key — using key-free public mode';
    console.log(`SamTube API running at http://localhost:${PORT} (${mode})`);
  });
}

start().catch(error => {
  console.error('[startup]', error.message);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`\n${signal} received, closing server...`);
  if (!server) return process.exit(0);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 4000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
