export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'S';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
}

export function timeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  for (const [unit, size] of units) {
    if (seconds >= size) {
      const amount = Math.floor(seconds / size);
      return `${amount} ${unit}${amount > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

export function metaLine(video) {
  return [video.views, video.publishedText, video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '']
    .filter(Boolean)
    .join(' • ');
}

export function handleThumbError(event, id) {
  const img = event.currentTarget;
  if (!img) return;
  // Try lighter variants once, then hide the broken image (dark placeholder stays, no broken icon).
  if (!img.dataset.fallback1) {
    img.dataset.fallback1 = '1';
    img.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  } else if (!img.dataset.fallback2) {
    img.dataset.fallback2 = '1';
    img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  } else {
    img.style.visibility = 'hidden';
  }
}

export function safeDescription(text = '') {
  return String(text)
    .replace(/\s+/g, ' ')
    .trim();
}
