'use strict';

// SamTube Filter Engine — decides whether a video belongs in a section feed.
//
// Pipeline:
//   1. BLOCK:  blocked channel / exclude topic / exclude keyword  (hard stop)
//   2. HARD:   duration range, language                           (mode-dependent)
//   3. SCORE:  include topics/keywords matched, preferred channels, education signals
//   4. MODE:   strict | balanced | discovery | custom-threshold decides admission
//
// Honest limitations (surfaced to the user, never faked):
//   - YouTube gives no verified "difficulty" or "education level" metadata, so those
//     filters only affect nothing yet — they are stored and validated, not silently faked.
//   - Captions/resolution/likes are not in search metadata — only what we have is used.

const DEVANAGARI = /[\u0900-\u097F]/;

const EDU_PATTERNS = [
  /\b(documentary|explained|education|educational|lecture|lesson|course|tutorial|masterclass|learn)\b/i,
  /\b(science|physics|chemistry|biology|history|geography|technology|space|philosophy|psychology|research|facts|upsc|exam|gk)\b/i,
  /(डॉक्यूमेंट्री|विज्ञान|इतिहास|भूगोल|शिक्षा|ज्ञान|अंतरिक्ष|अध्ययन|परीक्षा|सीखें|समझें|व्याख्या)/i
];

const DIACRITIC = /[̀-ͯ]/g;

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIC, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAsciiTerm(text) {
  return /^[\x20-\x7E]+$/.test(text);
}

// Word-ish match for latin terms; substring for Devanagari (\b fails there).
function termMatches(haystack, haystackLower, term) {
  const t = norm(term);
  if (!t) return false;
  if (isAsciiTerm(t)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(t)}([^a-z0-9]|$)`, 'i').test(haystack);
  }
  return haystackLower.includes(t);
}

function uniqueTerms(list) {
  const out = [];
  const seen = new Set();
  for (const raw of list || []) {
    const term = norm(raw);
    if (!term || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out;
}

function parseDurationSeconds(text) {
  if (!text || typeof text !== 'string') return null;
  const parts = text.trim().split(':').map(value => Number(value));
  if (parts.some(value => !Number.isFinite(value))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

// "1,234,567 views", "1.2M views", "3.4 crore views", "850k views"
function parseViewCount(text) {
  const raw = String(text || '').toLowerCase();
  const match = raw.match(/([\d]+(?:[.,]\d+)*)\s*(crore|cr|lakh|l|k|m|b|thousand|million|billion)?/i);
  if (!match) return 0;
  const num = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(num)) return 0;
  const unit = (match[2] || '').toLowerCase();
  const mult = { k: 1e3, thousand: 1e3, l: 1e5, lakh: 1e5, m: 1e6, million: 1e6, cr: 1e7, crore: 1e7, b: 1e9, billion: 1e9 }[unit] || 1;
  return Math.round(num * mult);
}

function detectLanguage(video) {
  const title = video.title || '';
  if (DEVANAGARI.test(title)) return 'hi';
  if (DEVANAGARI.test(video.channel || '')) return 'hi';
  if (/\b(hindi|हिंदी|हिन्दी)\b/i.test(`${title} ${video.channel || ''}`)) return 'hi';
  return 'en';
}

function educationBonus(video) {
  const haystack = `${video.title || ''} ${video.channel || ''} ${String(video.description || '').slice(0, 400)}`;
  let score = 0;
  for (const pattern of EDU_PATTERNS) if (pattern.test(haystack)) score += 3;
  return Math.min(10, score);
}

function ageBonus(video) {
  const age = video.ageDays;
  if (age === null || age === undefined) return 0;
  if (age < 7) return -1;
  if (age < 30) return 0;
  if (age < 365) return 1;
  return 2; // proven older content
}

/**
 * Evaluate one video against a section config.
 * @returns {{included: boolean, score: number, matchedTopics: string[], matchedKeywords: string[], excludedBy: string|null, why: string[]}}
 */
function evaluateVideo(video, section) {
  const title = video.title || '';
  const channel = video.channel || '';
  const haystack = `${title} ${channel} ${String(video.description || '').slice(0, 500)}`;
  const haystackLower = norm(haystack);
  const why = [];

  // 1. CHANNEL BLOCKS — always apply, every mode.
  const blocked = uniqueTerms(section.blockedChannels);
  const channelLower = norm(channel);
  for (const blockedTerm of blocked) {
    if (channelLower.includes(blockedTerm) || channelLower === blockedTerm) {
      return { included: false, score: 0, matchedTopics: [], matchedKeywords: [], excludedBy: `blocked channel: ${channel}`, why: [`Channel "${channel}" is blocked in this section`] };
    }
  }

  // 2. EXCLUDES — always apply, every mode.
  for (const term of [...(section.excludeTopics || []), ...(section.excludeKeywords || [])]) {
    if (termMatches(haystack, haystackLower, term)) {
      const label = String(term || '').trim();
      return { included: false, score: 0, matchedTopics: [], matchedKeywords: [], excludedBy: `excluded: ${label}`, why: [`Excluded term found: "${label}"`] };
    }
  }

  const strictness = section.mode === 'strict' ? 2 : section.mode === 'discovery' ? 0 : 1;
  // 3. DURATION RANGE.
  const secs = parseDurationSeconds(video.duration);
  if (secs !== null && (section.minDurationSec != null || section.maxDurationSec != null)) {
    const tooShort = section.minDurationSec != null && secs < section.minDurationSec;
    const tooLong = section.maxDurationSec != null && secs > section.maxDurationSec;
    if (tooShort || tooLong) {
      const reason = tooShort ? `shorter than ${Math.round(section.minDurationSec / 60)} min` : `longer than ${Math.round(section.maxDurationSec / 60)} min`;
      if (strictness === 2) {
        return { included: false, score: 0, matchedTopics: [], matchedKeywords: [], excludedBy: `duration ${reason}`, why: [`Duration filter: video is ${reason}`] };
      }
      why.push(`Duration out of range (${reason})`);
    }
  }

  // 4. LANGUAGE PREFERENCE.
  if (section.language === 'hi' || section.language === 'en') {
    const actual = detectLanguage(video);
    if (actual !== section.language) {
      if (strictness === 2) {
        return { included: false, score: 0, matchedTopics: [], matchedKeywords: [], excludedBy: `language: ${actual}`, why: [`Section prefers ${section.language} videos`] };
      }
      why.push(`Different language (${actual})`);
    }
  }

  // 5. INCLUDES — topics + keywords are the section's subject matter.
  // Match raw (original-case) terms so the UI can echo what matched; dedupe by normalized form.
  const matchRawTerms = rawList => {
    const out = [];
    const seen = new Set();
    for (const raw of rawList || []) {
      const t = norm(raw);
      if (!t || seen.has(t)) continue;
      seen.add(t);
      if (termMatches(haystack, haystackLower, raw)) out.push(String(raw).trim());
    }
    return out;
  };
  const uniqueMatchCount = rawList => {
    const seen = new Set();
    for (const raw of rawList || []) {
      const t = norm(raw);
      if (t) seen.add(t);
    }
    return seen.size;
  };
  const includeTopics = matchRawTerms(section.includeTopics);
  const includeKeywords = matchRawTerms(section.includeKeywords);
  const matchedTopics = includeTopics;
  const matchedKeywords = includeKeywords;
  const includeCount = uniqueMatchCount(section.includeTopics) + uniqueMatchCount(section.includeKeywords);
  const matchedCount = matchedTopics.length + matchedKeywords.length;

  let base;
  if (includeCount === 0) {
    base = 55; // no subject configured — everything passes with a neutral score
  } else if (matchedCount === 0) {
    if (section.mode === 'strict') {
      return { included: false, score: 0, matchedTopics, matchedKeywords, excludedBy: 'no include match', why: ['Strict mode: video matches none of this section\'s topics/keywords'] };
    }
    if (section.mode === 'balanced') {
      return { included: false, score: 0, matchedTopics, matchedKeywords, excludedBy: 'no include match', why: ['Balanced mode: needs at least one topic/keyword match'] };
    }
    base = 15; // discovery: stays open, ranked low
  } else {
    const ratio = matchedCount / includeCount;
    base = Math.round(45 + ratio * 50); // 45..95
  }

  let score = base;

  // Preferred channels — bonus.
  const preferred = uniqueTerms(section.preferredChannels);
  const channelPreferred = preferred.some(term => channelLower.includes(term));
  if (channelPreferred) score += 12;
  if (channelPreferred) why.push(`Preferred channel: ${channel}`);

  score += educationBonus(video);
  score += ageBonus(video);
  if (matchedTopics.length) why.push(`Topics: ${matchedTopics.join(', ')}`);
  if (matchedKeywords.length) why.push(`Keywords: ${matchedKeywords.join(', ')}`);
  if (why.length === 0) why.push('Matches this section\'s open include set');

  // Weak matches in non-discovery modes with duration/language violations get pushed down.
  if (section.minDurationSec != null || section.maxDurationSec != null) {
    const secs2 = secs;
    if (secs2 !== null && ((section.minDurationSec != null && secs2 < section.minDurationSec) || (section.maxDurationSec != null && secs2 > section.maxDurationSec))) {
      score -= strictness === 1 ? 25 : 10;
    }
  }
  if ((section.language === 'hi' || section.language === 'en') && detectLanguage(video) !== section.language) {
    score -= strictness === 1 ? 30 : 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // 6. MODE / THRESHOLD ADMISSION.
  const threshold = Number.isFinite(section.relevanceThreshold) ? section.relevanceThreshold : 45;
  let included;
  switch (section.mode) {
    case 'strict':
      included = matchedCount > 0 || includeCount === 0;
      break;
    case 'discovery':
      included = score >= Math.max(10, threshold - 30);
      break;
    case 'custom':
      included = score >= threshold;
      break;
    case 'balanced':
    default:
      included = score >= threshold;
      break;
  }

  return { included, score, matchedTopics, matchedKeywords, excludedBy: included ? null : `score ${score} < threshold ${threshold}`, why };
}

/**
 * Filter + sort a candidate pool for a section.
 * Returns flat video objects (id/title/... + score, matchedTopics, why) ready for the API.
 */
function filterAndRank(videos, section, { sort, limit } = {}) {
  const effectiveSort = sort || section.sort || 'smart';
  const scored = [];
  const seen = new Set();
  for (const video of videos) {
    if (!video?.id || seen.has(video.id)) continue;
    seen.add(video.id);
    const result = evaluateVideo(video, section);
    scored.push({ video, ...result });
  }
  const included = scored
    .filter(entry => entry.included)
    .map(entry => ({
      ...entry.video,
      score: entry.score,
      matchedTopics: entry.matchedTopics,
      matchedKeywords: entry.matchedKeywords,
      why: entry.why
    }));
  const excluded = scored.filter(entry => !entry.included);

  if (effectiveSort === 'oldest') {
    included.sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
  } else if (effectiveSort === 'newest') {
    included.sort((a, b) => Date.parse(a.publishedAt || 0) - Date.parse(b.publishedAt || 0));
  } else if (effectiveSort === 'popular') {
    included.sort((a, b) => parseViewCount(b.views) - parseViewCount(a.views));
  } else {
    included.sort((a, b) => b.score - a.score);
  }

  return {
    videos: included.slice(0, limit || 24),
    pool: included,
    stats: { fetched: videos.length, matched: included.length, blocked: excluded.length }
  };
}

/** Build the YouTube search queries for a section (what the section is "about"). */
function buildSectionQueries(section) {
  const queries = [];
  const clean = list => (list || []).map(value => String(value || '').trim()).filter(Boolean);
  for (const term of clean(section.includeKeywords)) queries.push(term);
  for (const term of clean(section.includeTopics)) queries.push(term);
  // Search works best with short phrases; cap to keep quota sane.
  return [...new Set(queries)].slice(0, 4);
}

module.exports = {
  evaluateVideo,
  filterAndRank,
  buildSectionQueries,
  parseDurationSeconds,
  parseViewCount,
  detectLanguage
};
