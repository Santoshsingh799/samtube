import { Clock3, Compass, Flame, Heart, Home, Info, ListVideo, Sparkles } from 'lucide-react';
import { useHistory, useLikes, usePlaylists } from '../lib/store';

export default function Sidebar({
  route,
  health,
  open = false,
  language = 'hi',
  topic = 'general',
  onLanguageChange,
  onNavigate,
  onHome,
  onExplore,
  onBhagwan
}) {
  const history = useHistory();
  const liked = useLikes();
  const playlists = usePlaylists();

  const isActive = view => {
    if (view === 'bhagwan') return route.view === 'home' && topic === 'bhagwan';
    if (view === 'home') return route.view === 'home' && topic !== 'bhagwan';
    return route.view === view;
  };

  const items = [
    { key: 'home', label: 'Home', icon: Home, href: '#/', action: onHome, count: null },
    { key: 'bhagwan', label: 'Bhagwan', icon: Flame, href: '#/', action: onBhagwan, count: null },
    { key: 'explore', label: 'Explore', icon: Compass, action: onExplore, count: null },
    { key: 'history', label: 'History', icon: Clock3, href: '#/history', count: history.length },
    { key: 'liked', label: 'Liked videos', icon: Heart, href: '#/liked', count: liked.length },
    { key: 'playlists', label: 'Playlists', icon: ListVideo, href: '#/playlists', count: playlists.length }
  ];

  const modeLabel =
    health === null
      ? 'Checking server…'
      : !health.ok
        ? 'Server offline'
        : health.mode === 'live'
          ? 'Live YouTube API'
          : 'Public mode (no key)';

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {items.map(item => {
          const Icon = item.icon;
          const active = isActive(item.key);
          return (
            <a
              key={item.key}
              href={item.href || '#/'}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={event => {
                if (item.action) {
                  event.preventDefault();
                  item.action();
                }
                onNavigate?.();
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {item.count ? <span className="nav-count">{item.count}</span> : null}
            </a>
          );
        })}
      </nav>

      <div className="sidebar-lang">
        <span>Language</span>
        <div className="seg" role="group" aria-label="Video language">
          {[
            { value: 'all', label: 'All' },
            { value: 'hi', label: 'हिंदी' },
            { value: 'en', label: 'EN' }
          ].map(option => (
            <button
              key={option.value}
              type="button"
              className={language === option.value ? 'on' : ''}
              onClick={() => onLanguageChange?.(option.value)}
              aria-pressed={language === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        <a className="nav-item" href="#/about" onClick={() => onNavigate?.()}>
          <Info size={20} />
          <span>About &amp; setup</span>
        </a>
      </nav>

      <div className="sidebar-note">
        <div className="mode-row">
          <span
            className={`status-dot ${
              health == null ? '' : health.ok ? (health.mode === 'live' ? 'live' : 'public') : 'off'
            }`}
          />
          <strong>{modeLabel}</strong>
        </div>
        <p>Hindi aur English videos, ek hi jagah — bina login, sab kuch tumhare browser me.</p>
        <div className="sidebar-cta">
          <Sparkles size={14} />
          <span>History, likes &amp; playlists saved locally</span>
        </div>
        <span className="legal">Playback by YouTube</span>
      </div>

      <div className="sidebar-brandline">
        <span className="brand-mark small" aria-hidden="true">
          S
        </span>
        SamTube
      </div>
    </aside>
  );
}
