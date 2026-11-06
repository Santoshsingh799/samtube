import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import WatchPage from './components/WatchPage';
import LibraryPage from './components/LibraryPage';
import PlaylistsPage from './components/PlaylistsPage';
import PlaylistDetailPage from './components/PlaylistDetailPage';
import AboutPage from './components/AboutPage';
import AuthPage from './components/AuthPage';
import SectionsPage from './components/SectionsPage';
import SectionBuilder from './components/SectionBuilder';
import SectionFeedPage from './components/SectionFeedPage';
import { api } from './lib/api';
import { navigate, useHashRoute } from './lib/router';
import { setPreference, setUser, usePrefs, useUser } from './lib/store';

export default function App() {
  const route = useHashRoute();
  const prefs = usePrefs();
  const user = useUser();
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState(null);

  const language = prefs.language || 'all';
  const sort = prefs.sort || 'smart';
  const topic = prefs.topic || 'general';
  const captionLanguage = prefs.captionLanguage || (language === 'all' ? 'hi' : language);
  const category = prefs.category || 'All';

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function check() {
      try {
        const data = await api.health({ signal: controller.signal });
        if (active) setHealth({ ok: true, ...data });
      } catch {
        if (active) setHealth({ ok: false, mode: 'offline' });
      }
    }

    check();
    const timer = setInterval(check, 45000);
    return () => {
      active = false;
      clearInterval(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    api.me().then(data => {
      if (active) setUser(data.user);
    }).catch(() => {
      if (active) setUser(null);
    });
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    setSidebarOpen(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route.view, route.id]);

  const handleSearch = useCallback(text => {
    setQuery(text);
    setRefreshKey(value => value + 1);
    if (window.location.hash !== '#/' && window.location.hash !== '') navigate('/');
  }, []);

  const handleLanguage = useCallback(value => {
    setPreference('language', value);
    // 'all' is not a real caption track — keep a concrete caption preference.
    if (value !== 'all') setPreference('captionLanguage', value);
  }, []);

  const handleSort = useCallback(value => {
    setPreference('sort', value);
  }, []);

  const handleTopic = useCallback(value => {
    setPreference('topic', value);
    setRefreshKey(v => v + 1);
  }, []);

  const handleCategory = useCallback(value => {
    setPreference('category', value);
  }, []);

  const handleHome = useCallback(() => {
    setQuery('');
    setPreference('category', 'All');
    setPreference('topic', 'general');
    setRefreshKey(value => value + 1);
    navigate('/');
  }, []);

  const handleExplore = useCallback(() => {
    setPreference('category', 'Documentary');
    setPreference('topic', 'general');
    setQuery('');
    setRefreshKey(value => value + 1);
    navigate('/');
  }, []);

  const handleBhagwan = useCallback(() => {
    setPreference('topic', 'bhagwan');
    setPreference('category', 'All');
    setQuery('');
    setSearchText('');
    setRefreshKey(value => value + 1);
    navigate('/');
  }, []);

  const handleAudiobook = useCallback(() => {
    setPreference('topic', 'audiobook');
    setPreference('category', 'All');
    setQuery('');
    setSearchText('');
    setRefreshKey(value => value + 1);
    navigate('/');
  }, []);

  const handleTrading = useCallback(() => {
    setPreference('topic', 'trading');
    setPreference('category', 'All');
    setQuery('');
    setSearchText('');
    setRefreshKey(value => value + 1);
    navigate('/');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      navigate('/');
    }
  }, []);

  const handleClearQuery = useCallback(() => {
    setQuery('');
    setRefreshKey(value => value + 1);
  }, []);

  const sectionsRoute = ['sections', 'section-builder', 'section-feed'].includes(route.view);
  // Sections are database-backed and per-user — send anonymous visitors to login.
  const needsAuth = sectionsRoute && !user;

  return (
    <div className="app-shell">
      <Topbar
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onSubmitSearch={handleSearch}
        language={language}
        topic={topic}
        onLanguageChange={handleLanguage}
        onMenuClick={() => setSidebarOpen(open => !open)}
      />

      <div className="layout">
        <Sidebar
          route={route}
          health={health}
          open={sidebarOpen}
          language={language}
          topic={topic}
          user={user}
          onLanguageChange={handleLanguage}
          onNavigate={() => setSidebarOpen(false)}
          onHome={handleHome}
          onExplore={handleExplore}
          onBhagwan={handleBhagwan}
          onAudiobook={handleAudiobook}
          onTrading={handleTrading}
          onLogout={handleLogout}
        />
        {sidebarOpen ? (
          <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
        ) : null}

        <main className="main-content">
          {route.view === 'home' ? (
            <HomePage
              query={query}
              language={language}
              sort={sort}
              topic={topic}
              category={category}
              health={health}
              refreshKey={refreshKey}
              onLanguageChange={handleLanguage}
              onSortChange={handleSort}
              onTopicChange={handleTopic}
              onCategoryChange={handleCategory}
              onClearQuery={handleClearQuery}
            />
          ) : null}

          {route.view === 'watch' ? (
            <WatchPage
              key={route.id}
              id={route.id}
              language={language}
              topic={topic}
              captionLanguage={captionLanguage}
              onCaptionLanguageChange={value => setPreference('captionLanguage', value)}
            />
          ) : null}

          {route.view === 'login' ? <AuthPage /> : null}
          {needsAuth ? <AuthPage /> : null}
          {!needsAuth && route.view === 'sections' ? <SectionsPage /> : null}
          {!needsAuth && route.view === 'section-builder' ? <SectionBuilder key={route.id || 'new'} id={route.id} /> : null}
          {!needsAuth && route.view === 'section-feed' ? <SectionFeedPage key={route.id} id={route.id} /> : null}

          {route.view === 'history' ? <LibraryPage type="history" /> : null}
          {route.view === 'liked' ? <LibraryPage type="liked" /> : null}
          {route.view === 'playlists' ? <PlaylistsPage /> : null}
          {route.view === 'playlist' ? <PlaylistDetailPage id={route.id} /> : null}
          {route.view === 'about' ? <AboutPage health={health} /> : null}

          <footer className="site-footer">
            <span>
              © {new Date().getFullYear()} SamTube · Videos embedded from YouTube · Made for Hindi &amp; English
            </span>
            <span className="footer-links">
              <a href="#/about">About</a>
              <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
                YouTube
              </a>
              <a href="#/playlists">Playlists</a>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
