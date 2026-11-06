import { BookOpen, Clock3, Compass, Flame, Heart, Home, Info, ListVideo, LogIn, LogOut, Layers, Sparkles, TrendingUp, Plus, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHistory, useLikes, usePlaylists } from '../lib/store';
import { api } from '../lib/api';

export default function Sidebar({
  route,
  health,
  open = false,
  language = 'hi',
  topic = 'general',
  user = null,
  onLanguageChange,
  onNavigate,
  onHome,
  onExplore,
  onBhagwan,
  onAudiobook,
  onTrading,
  onLogout
}) {
  const history = useHistory();
  const liked = useLikes();
  const playlists = usePlaylists();
  const [sections, setSections] = useState([]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setSections([]);
      return undefined;
    }
    api.sections.list()
      .then(data => { if (active) setSections((data.sections || []).filter(section => !section.hidden)); })
      .catch(() => { if (active) setSections([]); });
    return () => { active = false; };
  }, [user, route.view, route.id]);

  const isActive = view => {
    if (view === 'bhagwan') return route.view === 'home' && topic === 'bhagwan';
    if (view === 'audiobook') return route.view === 'home' && topic === 'audiobook';
    if (view === 'trading') return route.view === 'home' && topic === 'trading';
    if (view === 'home') return route.view === 'home' && topic !== 'bhagwan' && topic !== 'audiobook' && topic !== 'trading';
    return route.view === view;
  };

  const isSectionActive = id => route.view === 'section-feed' && route.id === id;

  const items = [
    { key: 'home', label: 'Home', icon: Home, href: '#/', action: onHome },
    { key: 'bhagwan', label: 'Bhagwan', icon: Flame, href: '#/', action: onBhagwan },
    { key: 'audiobook', label: 'Audiobooks', icon: BookOpen, href: '#/', action: onAudiobook },
    { key: 'trading', label: 'Trading', icon: TrendingUp, href: '#/', action: onTrading },
    { key: 'explore', label: 'Explore', icon: Compass, action: onExplore },
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

      <div className="sidebar-divider" />

      {/* ----------------------- My Sections (database-backed) ---------------------- */}
      <div className="sidebar-sections">
        <div className="sidebar-sections-head">
          <span>My Sections</span>
          <a href="#/sections/new" className="sidebar-sections-new" title="Create section" aria-label="Create section" onClick={() => onNavigate?.()}>
            <Plus size={16} />
          </a>
        </div>
        {!user ? (
          <a className="nav-item sidebar-login" href="#/login" onClick={() => onNavigate?.()}>
            <LogIn size={19} />
            <span>Login to save sections</span>
          </a>
        ) : sections.length === 0 ? (
          <a className="nav-item sidebar-empty" href="#/sections/new" onClick={() => onNavigate?.()}>
            <Layers size={19} />
            <span>Create your first section</span>
          </a>
        ) : (
          <nav className="sidebar-nav sidebar-sections-list">
            {sections.slice(0, 12).map(section => (
              <a
                key={section.id}
                href={`#/sections/${section.id}`}
                className={`nav-item section-nav-item ${isSectionActive(section.id) ? 'active' : ''}`}
                onClick={() => onNavigate?.()}
                title={section.name}
              >
                <span className="section-nav-icon">{section.icon}</span>
                <span className="section-nav-name">{section.name}</span>
              </a>
            ))}
            <a className="nav-item sidebar-manage" href="#/sections" onClick={() => onNavigate?.()}>
              <Settings2 size={17} />
              <span>Manage all sections{sections.length > 12 ? ` (${sections.length})` : ''}</span>
            </a>
          </nav>
        )}
      </div>

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
        {user ? (
          <div className="sidebar-user">
            <span className="sidebar-avatar" aria-hidden="true">{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</span>
            <span className="sidebar-user-meta">
              <strong>{user.displayName || user.email.split('@')[0]}</strong>
              <small>{user.email}</small>
            </span>
            <button className="icon-btn small" onClick={onLogout} title="Logout" aria-label="Logout">
              <LogOut size={17} />
            </button>
          </div>
        ) : (
          <a className="sidebar-cta" href="#/login" onClick={() => onNavigate?.()}>
            <LogIn size={14} />
            <span>Login / Sign up</span>
          </a>
        )}
        <div className="sidebar-cta static">
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
