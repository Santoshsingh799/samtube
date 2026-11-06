'use strict';

/**
 * Tiny in-memory cache with TTL + in-flight request de-duplication.
 * SamTube is a single-process app, so a Map is enough and avoids extra deps.
 */
class TTLCache {
  constructor({ max = 500 } = {}) {
    this.max = max;
    this.store = new Map();
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // refresh recency
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key, value, ttlMs) {
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const cache = new TTLCache({ max: 800 });
const inflight = new Map();

/**
 * Cache-through helper. `fn` must return a promise; concurrent callers share it.
 */
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit !== undefined) return { value: hit, cached: true };

  if (inflight.has(key)) {
    return { value: await inflight.get(key), cached: true };
  }

  const promise = Promise.resolve()
    .then(fn)
    .then(value => cache.set(key, value, ttlMs))
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return { value: await promise, cached: false };
}

module.exports = { cache, cached };
