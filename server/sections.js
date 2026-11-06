'use strict';

// Custom Sections: database-backed permanent sections with independent filter configs.
// All state lives in PostgreSQL — never in localStorage — so sections survive refresh,
// logout/login, redeploys, and sync across devices. Each user sees only their own rows.

const crypto = require('crypto');
const express = require('express');
const db = require('./db');
const youtube = require('./youtube');
const { evaluateVideo, filterAndRank, buildSectionQueries } = require('./filterEngine');
const { requireAuth } = require('./auth');

const router = express.Router();

/* ------------------------------ tiny validators ------------------------------ */

function cleanString(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanStringArray(value, { maxItems = 80, maxLength = 120 } = {}) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of value) {
    const text = cleanString(raw, maxLength);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

function cleanInt(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function cleanBool(value) {
  return value === true || value === 'true' || value === 1;
}

function cleanMode(value) {
  return ['strict', 'balanced', 'discovery', 'custom'].includes(value) ? value : 'balanced';
}

function cleanLanguage(value) {
  return ['all', 'hi', 'en'].includes(value) ? value : 'all';
}

function cleanDifficulty(value) {
  return ['any', 'beginner', 'intermediate', 'advanced'].includes(value) ? value : 'any';
}

function cleanSort(value) {
  return ['smart', 'oldest', 'newest', 'popular'].includes(value) ? value : 'smart';
}

function cleanIcon(value) {
  const icon = cleanString(value, 16);
  return icon || '📁';
}

function sectionPayload(body, { partial = false } = {}) {
  const input = body || {};
  const out = {};

  if (!partial || 'name' in input) {
    const name = cleanString(input.name, 80);
    if (!name && !partial) out._nameInvalid = true;
    if (name) out.name = name;
  }
  if (!partial || 'description' in input) out.description = cleanString(input.description, 300);
  if (!partial || 'icon' in input) out.icon = cleanIcon(input.icon);
  if (!partial || 'coverUrl' in input) out.cover_url = cleanString(input.coverUrl, 500);
  if (!partial || 'mode' in input) out.mode = cleanMode(input.mode);
  if (!partial || 'relevanceThreshold' in input) out.relevance_threshold = cleanInt(input.relevanceThreshold, 0, 100, 45);
  if (!partial || 'language' in input) out.language = cleanLanguage(input.language);
  if (!partial || 'difficulty' in input) out.difficulty = cleanDifficulty(input.difficulty);
  if (!partial || 'minDurationSec' in input) out.minDurationSec = input.minDurationSec == null ? null : cleanInt(input.minDurationSec, 0, 60 * 60 * 12, null);
  if (!partial || 'maxDurationSec' in input) out.maxDurationSec = input.maxDurationSec == null ? null : cleanInt(input.maxDurationSec, 0, 60 * 60 * 12, null);
  if (!partial || 'includeTopics' in input) out.include_topics = cleanStringArray(input.includeTopics, { maxItems: 80, maxLength: 80 });
  if (!partial || 'excludeTopics' in input) out.exclude_topics = cleanStringArray(input.excludeTopics, { maxItems: 80, maxLength: 80 });
  if (!partial || 'includeKeywords' in input) out.include_keywords = cleanStringArray(input.includeKeywords, { maxItems: 80, maxLength: 80 });
  if (!partial || 'excludeKeywords' in input) out.exclude_keywords = cleanStringArray(input.excludeKeywords, { maxItems: 80, maxLength: 80 });
  if (!partial || 'preferredChannels' in input) out.preferred_channels = cleanStringArray(input.preferredChannels, { maxItems: 50, maxLength: 120 });
  if (!partial || 'blockedChannels' in input) out.blocked_channels = cleanStringArray(input.blockedChannels, { maxItems: 50, maxLength: 120 });
  if (!partial || 'sort' in input) out.sort = cleanSort(input.sort);
  if (!partial || 'pinned' in input) out.pinned = cleanBool(input.pinned);
  if (!partial || 'hidden' in input) out.hidden = cleanBool(input.hidden);
  if (!partial || 'favorite' in input) out.favorite = cleanBool(input.favorite);

  // minimum sanity: min <= max when both set
  const minD = 'minDurationSec' in out ? out.minDurationSec : undefined;
  const maxD = 'maxDurationSec' in out ? out.maxDurationSec : undefined;
  if (minD != null && maxD != null && minD > maxD) {
    out.minDurationSec = maxD;
    out.maxDurationSec = minD;
  }
  return out;
}

function toSection(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    coverUrl: row.cover_url,
    mode: row.mode,
    relevanceThreshold: row.relevance_threshold,
    language: row.language,
    difficulty: row.difficulty,
    minDurationSec: row.min_duration_sec,
    maxDurationSec: row.max_duration_sec,
    includeTopics: row.include_topics || [],
    excludeTopics: row.exclude_topics || [],
    includeKeywords: row.include_keywords || [],
    excludeKeywords: row.exclude_keywords || [],
    preferredChannels: row.preferred_channels || [],
    blockedChannels: row.blocked_channels || [],
    sort: row.sort,
    pinned: row.pinned,
    hidden: row.hidden,
    favorite: row.favorite,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function loadOwnedSection(req, id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) return null;
  const result = await db.query('SELECT * FROM custom_sections WHERE id = $1 AND user_id = $2', [id, req.user.id]);
  return result.rows[0] || null;
}

/* ------------------------------ filter registry ------------------------------ */

let registryCache = { at: 0, data: null };
const REGISTRY_TTL_MS = 10 * 60 * 1000;

/** GET /api/filters — categories + definitions from the database (never hardcoded). */
async function filtersHandler(_req, res, next) {
  try {
    if (!db.isConfigured()) {
      return res.status(503).json({ error: 'Database not configured.', code: 'DB_NOT_CONFIGURED' });
    }
    if (registryCache.data && Date.now() - registryCache.at < REGISTRY_TTL_MS) {
      return res.json(registryCache.data);
    }
    const [categories, definitions] = await Promise.all([
      db.query('SELECT id, label, description, sort, kind FROM filter_categories WHERE active = true ORDER BY sort, label'),
      db.query('SELECT id, category_id, label, sort FROM filter_definitions WHERE active = true ORDER BY category_id, sort, label')
    ]);
    const byCategory = new Map();
    for (const row of definitions.rows) {
      if (!byCategory.has(row.category_id)) byCategory.set(row.category_id, []);
      byCategory.get(row.category_id).push({ id: row.id, label: row.label });
    }
    const data = {
      categories: categories.rows.map(category => ({
        id: category.id,
        label: category.label,
        description: category.description,
        kind: category.kind,
        options: byCategory.get(category.id) || []
      })),
      generatedAt: new Date().toISOString()
    };
    registryCache = { at: Date.now(), data };
    res.json(data);
  } catch (error) {
    next(error);
  }
}

/* ------------------------------- sections CRUD ------------------------------- */

async function listSections(req, res, next) {
  try {
    const result = await db.query(
      `SELECT * FROM custom_sections
        WHERE user_id = $1
        ORDER BY hidden ASC, pinned DESC, favorite DESC, position ASC, created_at ASC`,
      [req.user.id]
    );
    res.json({ sections: result.rows.map(toSection) });
  } catch (error) {
    next(error);
  }
}

async function createSection(req, res, next) {
  try {
    const body = sectionPayload(req.body, { partial: false });
    if (body._nameInvalid) {
      return res.status(400).json({ error: 'Section name (1-80 characters) is required.', code: 'INVALID_NAME' });
    }
    const { rows } = await db.query(
      `INSERT INTO custom_sections
        (user_id, name, description, icon, cover_url, mode, relevance_threshold, language, difficulty,
         min_duration_sec, max_duration_sec, include_topics, exclude_topics, include_keywords,
         exclude_keywords, preferred_channels, blocked_channels, sort, pinned, hidden, favorite, position)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
         (SELECT COALESCE(MAX(position), 0) + 1 FROM custom_sections WHERE user_id = $1))
       RETURNING *`,
      [
        req.user.id,
        body.name,
        body.description ?? '',
        body.icon ?? '📁',
        body.cover_url ?? '',
        body.mode ?? 'balanced',
        body.relevance_threshold ?? 45,
        body.language ?? 'all',
        body.difficulty ?? 'any',
        body.minDurationSec ?? null,
        body.maxDurationSec ?? null,
        body.include_topics ?? [],
        body.exclude_topics ?? [],
        body.include_keywords ?? [],
        body.exclude_keywords ?? [],
        body.preferred_channels ?? [],
        body.blocked_channels ?? [],
        body.sort ?? 'smart',
        body.pinned ?? false,
        body.hidden ?? false,
        body.favorite ?? false
      ]
    );
    res.status(201).json({ section: toSection(rows[0]) });
  } catch (error) {
    next(error);
  }
}

async function getSection(req, res, next) {
  try {
    const row = await loadOwnedSection(req, req.params.id);
    if (!row) return res.status(404).json({ error: 'Section not found.', code: 'SECTION_NOT_FOUND' });
    res.json({ section: toSection(row) });
  } catch (error) {
    next(error);
  }
}

const UPDATE_COLUMNS = {
  name: 'name',
  description: 'description',
  icon: 'icon',
  cover_url: 'cover_url',
  mode: 'mode',
  relevance_threshold: 'relevance_threshold',
  language: 'language',
  difficulty: 'difficulty',
  minDurationSec: 'min_duration_sec',
  maxDurationSec: 'max_duration_sec',
  include_topics: 'include_topics',
  exclude_topics: 'exclude_topics',
  include_keywords: 'include_keywords',
  exclude_keywords: 'exclude_keywords',
  preferred_channels: 'preferred_channels',
  blocked_channels: 'blocked_channels',
  sort: 'sort',
  pinned: 'pinned',
  hidden: 'hidden',
  favorite: 'favorite'
};

async function updateSection(req, res, next) {
  try {
    const row = await loadOwnedSection(req, req.params.id);
    if (!row) return res.status(404).json({ error: 'Section not found.', code: 'SECTION_NOT_FOUND' });

    const partial = req.method === 'PATCH';
    const body = sectionPayload(req.body, { partial });
    if ('_nameInvalid' in body) {
      return res.status(400).json({ error: 'Section name (1-80 characters) is required.', code: 'INVALID_NAME' });
    }
    const sets = [];
    const values = [];
    let index = 1;
    for (const [key, column] of Object.entries(UPDATE_COLUMNS)) {
      if (key in body) {
        sets.push(`${column} = $${index}`);
        values.push(body[key]);
        index += 1;
      }
    }
    // Full PUT requires a name.
    if (!partial && !('name' in body)) {
      return res.status(400).json({ error: 'Section name is required.', code: 'INVALID_NAME' });
    }
    if (!sets.length) {
      return res.json({ section: toSection(row) });
    }
    sets.push(`updated_at = now()`);
    values.push(row.id, req.user.id);
    const { rows } = await db.query(
      `UPDATE custom_sections SET ${sets.join(', ')} WHERE id = $${index} AND user_id = $${index + 1} RETURNING *`,
      values
    );
    res.json({ section: toSection(rows[0]) });
  } catch (error) {
    next(error);
  }
}

async function duplicateSection(req, res, next) {
  try {
    const row = await loadOwnedSection(req, req.params.id);
    if (!row) return res.status(404).json({ error: 'Section not found.', code: 'SECTION_NOT_FOUND' });
    const baseName = `${row.name} (copy)`.slice(0, 80);
    const { rows } = await db.query(
      `INSERT INTO custom_sections
        (user_id, name, description, icon, cover_url, mode, relevance_threshold, language, difficulty,
         min_duration_sec, max_duration_sec, include_topics, exclude_topics, include_keywords,
         exclude_keywords, preferred_channels, blocked_channels, sort, pinned, hidden, favorite, position)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,false,false,false,
         (SELECT COALESCE(MAX(position), 0) + 1 FROM custom_sections WHERE user_id = $1))
       RETURNING *`,
      [
        req.user.id, baseName, row.description, row.icon, row.cover_url, row.mode, row.relevance_threshold,
        row.language, row.difficulty, row.min_duration_sec, row.max_duration_sec,
        row.include_topics, row.exclude_topics, row.include_keywords, row.exclude_keywords,
        row.preferred_channels, row.blocked_channels, row.sort
      ]
    );
    res.status(201).json({ section: toSection(rows[0]) });
  } catch (error) {
    next(error);
  }
}

async function reorderSections(req, res, next) {
  try {
    const ids = cleanStringArray(req.body?.orderedIds, { maxItems: 500, maxLength: 40 });
    if (!ids.length) return res.status(400).json({ error: 'orderedIds required.', code: 'INVALID_REORDER' });
    const owned = await db.query('SELECT id FROM custom_sections WHERE user_id = $1 AND id = ANY($2::uuid[])', [req.user.id, ids]);
    const ownedSet = new Set(owned.rows.map(row => row.id));
    const ordered = ids.filter(id => ownedSet.has(id));
    await Promise.all(
      ordered.map((id, index) =>
        db.query('UPDATE custom_sections SET position = $1, updated_at = now() WHERE id = $2 AND user_id = $3', [index, id, req.user.id])
      )
    );
    res.json({ ok: true, reordered: ordered.length });
  } catch (error) {
    next(error);
  }
}

async function deleteSection(req, res, next) {
  try {
    const result = await db.query('DELETE FROM custom_sections WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Section not found.', code: 'SECTION_NOT_FOUND' });
    res.json({ ok: true, deleted: result.rows[0].id });
  } catch (error) {
    next(error);
  }
}

function exportPayload(section) {
  return {
    format: 'samtube-section@1',
    exportedAt: new Date().toISOString(),
    section: {
      name: section.name,
      description: section.description,
      icon: section.icon,
      coverUrl: section.coverUrl,
      mode: section.mode,
      relevanceThreshold: section.relevanceThreshold,
      language: section.language,
      difficulty: section.difficulty,
      minDurationSec: section.minDurationSec,
      maxDurationSec: section.maxDurationSec,
      includeTopics: section.includeTopics,
      excludeTopics: section.excludeTopics,
      includeKeywords: section.includeKeywords,
      excludeKeywords: section.excludeKeywords,
      preferredChannels: section.preferredChannels,
      blockedChannels: section.blockedChannels,
      sort: section.sort
    }
  };
}

async function exportSection(req, res, next) {
  try {
    const row = await loadOwnedSection(req, req.params.id);
    if (!row) return res.status(404).json({ error: 'Section not found.', code: 'SECTION_NOT_FOUND' });
    res.setHeader('content-disposition', `attachment; filename="samtube-section-${row.id}.json"`);
    res.json(exportPayload(toSection(row)));
  } catch (error) {
    next(error);
  }
}

async function importSection(req, res, next) {
  try {
    const payload = req.body?.section || req.body;
    const body = sectionPayload(payload, { partial: false });
    if (body._nameInvalid || !body.name) {
      return res.status(400).json({ error: 'Import file needs a section name (1-80 characters).', code: 'INVALID_IMPORT' });
    }
    const { rows } = await db.query(
      `INSERT INTO custom_sections
        (user_id, name, description, icon, cover_url, mode, relevance_threshold, language, difficulty,
         min_duration_sec, max_duration_sec, include_topics, exclude_topics, include_keywords,
         exclude_keywords, preferred_channels, blocked_channels, sort, pinned, hidden, favorite, position)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,false,false,false,
         (SELECT COALESCE(MAX(position), 0) + 1 FROM custom_sections WHERE user_id = $1))
       RETURNING *`,
      [
        req.user.id, body.name, body.description ?? '', body.icon ?? '📁', body.cover_url ?? '',
        body.mode ?? 'balanced', body.relevance_threshold ?? 45, body.language ?? 'all', body.difficulty ?? 'any',
        body.minDurationSec ?? null, body.maxDurationSec ?? null,
        body.include_topics ?? [], body.exclude_topics ?? [], body.include_keywords ?? [], body.exclude_keywords ?? [],
        body.preferred_channels ?? [], body.blocked_channels ?? [], body.sort ?? 'smart'
      ]
    );
    res.status(201).json({ section: toSection(rows[0]) });
  } catch (error) {
    next(error);
  }
}

/* ----------------------------- section feed (§8) ----------------------------- */

// Short-lived page tokens for multi-lane feed pagination (continuations are large).
const feedTokens = new Map();
const FEED_TOKEN_TTL_MS = 30 * 60 * 1000;

function storeFeedToken(payload) {
  for (const [key, entry] of feedTokens) {
    if (entry.expires <= Date.now()) feedTokens.delete(key);
  }
  if (feedTokens.size > 1000) feedTokens.clear();
  const id = crypto.randomBytes(12).toString('hex');
  feedTokens.set(id, { ...payload, expires: Date.now() + FEED_TOKEN_TTL_MS });
  return id;
}

function loadFeedToken(id) {
  const entry = feedTokens.get(String(id || ''));
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    feedTokens.delete(id);
    return null;
  }
  return entry;
}

function interleave(lists) {
  const out = [];
  const seen = new Set();
  const max = Math.max(0, ...lists.map(list => list.length));
  for (let index = 0; index < max; index += 1) {
    for (const list of lists) {
      const video = list[index];
      if (!video?.id || seen.has(video.id)) continue;
      seen.add(video.id);
      out.push(video);
    }
  }
  return out;
}

async function sectionFeed(req, res, next) {
  try {
    const row = await loadOwnedSection(req, req.params.id);
    if (!row) return res.status(404).json({ error: 'Section not found.', code: 'SECTION_NOT_FOUND' });
    const section = toSection(row);
    section.user_id = req.user.id;
    section.id = row.id;

    const limit = cleanInt(req.query.limit, 1, 48, 24);
    const q = cleanString(req.query.q, 120);
    const sort = cleanSort(req.query.sort || section.sort);

    const queries = q ? [q] : buildSectionQueries(section);
    if (!queries.length) {
      return res.json({
        videos: [],
        nextPageToken: null,
        mode: 'feed',
        needsSetup: true,
        hint: 'This section has no topics or keywords yet. Add some above so SamTube knows what to fetch.',
        section: { id: section.id, name: section.name, icon: section.icon, mode: section.mode },
        filters: { language: section.language, mode: section.mode, relevanceThreshold: section.relevanceThreshold, topics: section.includeTopics.length, keywords: section.includeKeywords.length },
        stats: { fetched: 0, matched: 0 }
      });
    }

    // Page state (tokens + seen ids) — stored server-side, referenced by short token.
    let laneState = null;
    if (req.query.pageToken) {
      laneState = loadFeedToken(String(req.query.pageToken).replace(/^feed:/, ''));
      if (!laneState) {
        return res.json({ videos: [], nextPageToken: null, mode: 'feed', expired: true, section: { id: section.id, name: section.name, icon: section.icon } });
      }
    }

    const lanes = [];
    if (section.language === 'hi') {
      for (const query of queries) lanes.push({ query, lang: 'hi' });
    } else if (section.language === 'en') {
      for (const query of queries) lanes.push({ query, lang: 'en' });
    } else {
      for (const query of queries) {
        lanes.push({ query, lang: 'hi' });
        lanes.push({ query, lang: 'en' });
      }
    }

    let tokens = laneState ? [...laneState.tokens] : lanes.map(() => '');
    if (tokens.length !== lanes.length) tokens = lanes.map((_, index) => tokens[index] || '');
    const seen = new Set(laneState ? laneState.seen : []);
    let raw = [];
    let rounds = 0;
    let anyContinuation = tokens.some(Boolean);

    // Over-fetch in rounds; the engine drops non-matching videos, so one page of
    // YouTube results can shrink a lot — loop until we have enough or lanes run dry.
    for (rounds = 0; rounds < 4; rounds += 1) {
      const pages = await Promise.all(
        lanes.map((lane, index) =>
          youtube.rawSearch({ q: lane.query, language: lane.lang, max: 30, pageToken: tokens[index] || '' })
        )
      );
      const perLane = pages.map(page => page.videos || []);
      const merged = interleave(perLane);
      raw.push(...merged);
      tokens = pages.map(page => page.nextPageToken || '');
      anyContinuation = tokens.some(Boolean);
      const unseen = raw.filter(video => !seen.has(video.id));
      const { videos } = filterAndRank(unseen, section, { sort, limit: limit * 2 });
      if (videos.length >= limit || !anyContinuation) break;
    }

    const unseen = raw.filter(video => !seen.has(video.id));
    const { videos, stats } = filterAndRank(unseen, section, { sort, limit });
    const pageIds = videos.map(video => video.id);
    // Skip already-returned pages entirely (seen accumulates page ids).
    const nextSeen = [...seen, ...pageIds];
    const hasMore = anyContinuation || raw.length > videos.length;
    const nextToken = hasMore && tokens.some(Boolean)
      ? `feed:${storeFeedToken({ tokens, seen: nextSeen, mode: 'feed' })}`
      : null;

    res.json({
      videos: videos.map(video => ({
        id: video.id,
        title: video.title,
        channel: video.channel,
        channelId: video.channelId,
        description: String(video.description || '').slice(0, 200),
        publishedAt: video.publishedAt,
        ageDays: video.ageDays,
        thumbnail: video.thumbnail,
        duration: video.duration,
        views: video.views
      })),
      nextPageToken: nextToken,
      mode: 'feed',
      section: { id: section.id, name: section.name, icon: section.icon, mode: section.mode },
      filters: {
        language: section.language,
        mode: section.mode,
        relevanceThreshold: section.relevanceThreshold,
        sort,
        topics: section.includeTopics.length,
        keywords: section.includeKeywords.length,
        excludeTopics: section.excludeTopics.length,
        excludeKeywords: section.excludeKeywords.length
      },
      stats: { ...stats, rounds: rounds + 1, queries: queries.length }
    });
  } catch (error) {
    next(error);
  }
}

// Per-video relevance explainer ("Why am I seeing this?") for section feeds.
async function explainVideo(req, res, next) {
  try {
    const row = await loadOwnedSection(req, req.params.id);
    if (!row) return res.status(404).json({ error: 'Section not found.', code: 'SECTION_NOT_FOUND' });
    const section = toSection(row);
    const video = req.body?.video || {};
    const result = evaluateVideo(video, section);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

router.get('/filters', filtersHandler);
router.get('/sections', requireAuth, listSections);
router.post('/sections', requireAuth, createSection);
router.post('/sections/reorder', requireAuth, reorderSections);
router.post('/sections/import', requireAuth, importSection);
router.get('/sections/:id', requireAuth, getSection);
router.put('/sections/:id', requireAuth, updateSection);
router.patch('/sections/:id', requireAuth, updateSection);
router.post('/sections/:id/duplicate', requireAuth, duplicateSection);
router.delete('/sections/:id', requireAuth, deleteSection);
router.get('/sections/:id/export', requireAuth, exportSection);
router.get('/sections/:id/feed', requireAuth, sectionFeed);
router.post('/sections/:id/explain', requireAuth, explainVideo);

module.exports = router;
