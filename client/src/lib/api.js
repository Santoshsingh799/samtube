const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  return search.toString();
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener?.('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    }, { once: true });
  });
}

async function request(path, { signal, retries = 2 } = {}) {
  let response;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(path, { signal, headers: { accept: 'application/json' } });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new ApiError(
        'Server se connect nahi ho paya. Kya backend chal raha hai? (npm run dev)',
        0,
        'NETWORK_ERROR'
      );
    }

    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;

    // Rate-limited: wait for Retry-After and retry quietly (user never sees the error).
    if (response.status === 429 && attempt < retries) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1200 * (attempt + 1);
      await sleep(Math.min(waitMs, 10000), signal);
      continue;
    }

    const message =
      response.status === 429
        ? 'Thoda wait karo — server busy hai. 10 second baad Try again dabao.'
        : data.error || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, data.code);
  }
}

export const api = {
  health: (options) => request(`${API_BASE}/health`, options),

  search: ({ q = '', language = 'en', category = '', pageToken = '', limit = 24, sort = 'smart', topic = 'general' }, options) =>
    request(`${API_BASE}/videos?${buildQuery({ q, language, category, pageToken, limit, sort, topic })}`, options),

  video: (id, options) => request(`${API_BASE}/video/${encodeURIComponent(id)}`, options),

  related: ({ id, title = '', channel = '', language = 'en', limit = 10 }, options) =>
    request(`${API_BASE}/related/${encodeURIComponent(id)}?${buildQuery({ title, channel, language, limit })}`, options),

  suggest: (q, language, topic, options) =>
    request(`${API_BASE}/suggest?${buildQuery({ q, language, topic })}`, options)
};
