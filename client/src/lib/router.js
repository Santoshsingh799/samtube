import { useEffect, useState } from 'react';

function parseHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const path = raw.split('?')[0] || '/';
  const parts = path.split('/').filter(Boolean);

  if (!parts.length) return { view: 'home' };
  if (parts[0] === 'watch' && parts[1]) return { view: 'watch', id: parts[1] };
  if (parts[0] === 'history') return { view: 'history' };
  if (parts[0] === 'liked') return { view: 'liked' };
  if (parts[0] === 'playlists') return { view: 'playlists' };
  if (parts[0] === 'playlist' && parts[1]) return { view: 'playlist', id: parts[1] };
  if (parts[0] === 'about') return { view: 'about' };
  return { view: 'home' };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(path) {
  const next = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = next;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function goBack() {
  if (window.history.length > 1) window.history.back();
  else navigate('/');
}
