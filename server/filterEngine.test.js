'use strict';
// Filter engine unit tests — run: node server/filterEngine.test.js
const assert = require('assert');
const fe = require('./filterEngine');

const baseSection = {
  mode: 'strict',
  relevanceThreshold: 45,
  language: 'all',
  difficulty: 'any',
  minDurationSec: null,
  maxDurationSec: null,
  includeTopics: ['Machine Learning', 'Python'],
  excludeTopics: ['Gaming'],
  includeKeywords: ['neural network'],
  excludeKeywords: ['comedy'],
  preferredChannels: ['pranjal'],
  blockedChannels: ['spammy channel'],
  sort: 'smart'
};

const video = (over = {}) => ({
  id: 'vid12345678',
  title: 'Machine Learning Tutorial in Python',
  channel: 'Some Channel',
  channelId: 'UC123',
  description: 'Learn neural network basics with python.',
  publishedAt: '2020-05-01T00:00:00Z',
  ageDays: 2000,
  duration: '12:34',
  views: '1.2M views',
  ...over
});

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ok  ' + name);
  } catch (error) {
    console.error('FAIL  ' + name + ' — ' + error.message);
    process.exitCode = 1;
  }
}

console.log('filterEngine tests\n');

test('strict: include match -> included, high score', () => {
  const r = fe.evaluateVideo(video(), baseSection);
  assert.strictEqual(r.included, true);
  assert.ok(r.score >= 45, 'score should be high');
  assert.deepStrictEqual(r.matchedTopics.sort(), ['Machine Learning', 'Python'].sort());
});

test('strict: no include match -> excluded', () => {
  const r = fe.evaluateVideo(video({ title: 'Cooking biryani at home', description: 'rice and spice' }), baseSection);
  assert.strictEqual(r.included, false);
  assert.ok(r.excludedBy.includes('no include match'));
});

test('strict: block list channel always wins', () => {
  const r = fe.evaluateVideo(video({ channel: 'Spammy Channel Official' }), baseSection);
  assert.strictEqual(r.included, false);
  assert.ok(r.excludedBy.includes('blocked channel'));
});

test('strict: exclude topic wins even with include match', () => {
  const r = fe.evaluateVideo(video({ title: 'Machine Learning explained for Gaming fans' }), baseSection);
  assert.strictEqual(r.included, false);
  assert.ok(r.excludedBy.includes('excluded'));
});

test('exclude keyword beats include (description)', () => {
  const r = fe.evaluateVideo(video({ description: 'Machine learning but also comedy roast' }), baseSection);
  assert.strictEqual(r.included, false);
});

test('balanced requires threshold', () => {
  const s = { ...baseSection, mode: 'balanced', relevanceThreshold: 90 };
  const r = fe.evaluateVideo(video({ description: 'nothing relevant here about neural network at all', title: 'Neural network overview' }), s);
  assert.strictEqual(r.included, false); // score < 90
});

test('discovery admits weak matches below balanced threshold', () => {
  const s = { ...baseSection, mode: 'discovery', relevanceThreshold: 45 };
  const r = fe.evaluateVideo(video({ title: 'Totally unrelated vlog episode', description: 'nothing about ml' }), s);
  assert.strictEqual(r.included, true);
  assert.ok(r.score < 45);
});

test('preferred channel adds bonus', () => {
  const partial = { title: 'Python tutorial', description: 'python basics' };
  const plain = fe.evaluateVideo(video(partial), baseSection);
  const boosted = fe.evaluateVideo(video({ ...partial, channel: 'Pranjal Kamra' }), baseSection);
  assert.ok(boosted.score > plain.score, `boosted ${boosted.score} should exceed plain ${plain.score}`);
});

test('duration filter: strict excludes out-of-range', () => {
  const s = { ...baseSection, minDurationSec: 600, maxDurationSec: 1800 };
  const r = fe.evaluateVideo(video({ duration: '1:00' }), s);
  assert.strictEqual(r.included, false);
  assert.ok(r.excludedBy.includes('duration'));
});

test('duration filter: long video passes when max is high', () => {
  const s = { ...baseSection, minDurationSec: 60 };
  const r = fe.evaluateVideo(video({ duration: '45:00' }), s);
  assert.strictEqual(r.included, true);
});

test('language strict: english-only section excludes devanagari title', () => {
  const s = { ...baseSection, language: 'en' };
  const r = fe.evaluateVideo(video({ title: 'मशीन लर्निंग ट्यूटोरियल हिंदी' }), s);
  assert.strictEqual(r.included, false);
  assert.ok(r.excludedBy.includes('language'));
});

test('open section (no includes) passes everything', () => {
  const s = { ...baseSection, includeTopics: [], includeKeywords: [] };
  const r = fe.evaluateVideo(video({ title: 'random cooking video' }), s);
  assert.strictEqual(r.included, true);
});

test('exclude wins even on open section', () => {
  const s = { ...baseSection, includeTopics: [], includeKeywords: [] };
  const r = fe.evaluateVideo(video({ title: 'funny comedy compilation' }), s);
  assert.strictEqual(r.included, false);
});

test('word-boundary matching avoids partial word hits', () => {
  const s = { ...baseSection, includeTopics: ['ML'], includeKeywords: [] };
  const r = fe.evaluateVideo(video({ title: 'XmlHttpRequest tutorial' }), s);
  assert.strictEqual(r.included, false); // "ML" inside "Xml" must not match... actually 'ml' in 'xmlhttp' has word boundaries? no -> excluded
});

test('filterAndRank sorts by score and dedupes', () => {
  const out = fe.filterAndRank([video(), video(), video({ id: 'vid87654321', title: 'neural network deep dive' })], baseSection, { sort: 'smart', limit: 24 });
  assert.strictEqual(out.stats.fetched, 3);
  const ids = out.videos.map(v => v.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.ok(out.videos[0].score >= out.videos[out.videos.length - 1].score);
});

test('buildSectionQueries caps at 4 and dedupes', () => {
  const queries = fe.buildSectionQueries({ includeKeywords: ['a', 'b', 'a', 'c'], includeTopics: ['d', 'e', 'f'] });
  assert.deepStrictEqual(queries, ['a', 'b', 'c', 'd']);
});

test('parseViewCount handles indian + intl formats', () => {
  assert.strictEqual(fe.parseViewCount('1,234,567 views'), 1234567);
  assert.strictEqual(fe.parseViewCount('1.2M views'), 1200000);
  assert.strictEqual(fe.parseViewCount('3.4 crore views'), 34000000);
  assert.strictEqual(fe.parseViewCount('850k views'), 850000);
});

console.log(`\n${passed} tests passed${process.exitCode ? ' (with failures)' : ''}`);
