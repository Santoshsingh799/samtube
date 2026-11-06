import { useCallback, useEffect, useRef, useState } from 'react';
import { Languages, Play, RefreshCw, SearchX, Sparkles, WifiOff } from 'lucide-react';
import { api } from '../lib/api';
import { rememberVideos } from '../lib/videoCache';
import { useToast } from './Toast';
import VideoCard from './VideoCard';
import { SkeletonGrid } from './Skeleton';
import EmptyState from './EmptyState';

export const CATEGORIES = [
  'All',
  'Technology',
  'Science',
  'History',
  'Mystery',
  'Education',
  'Documentary',
  'Space',
  'AI',
  'Gaming',
  'Music'
];

export const BHAGWAN_SUBTOPICS = [
  { label: 'सभी', query: '' },
  { label: 'Mahabharat', query: 'Mahabharat Hindi' },
  { label: 'Ramayan', query: 'Ramayan Hindi' },
  { label: 'Upanishad', query: 'Upanishad Hindi' },
  { label: 'Ganga', query: 'Ganga documentary Hindi' },
  { label: 'Geeta', query: 'Bhagavad Geeta Hindi' },
  { label: 'Krishna', query: 'Krishna Leela Hindi' },
  { label: 'Shiv', query: 'Shiv Puran Hindi' },
  { label: 'Hanuman', query: 'Hanuman Hindi' }
];

export default function HomePage({
  query,
  language = 'all',
  sort = 'smart',
  topic = 'general',
  category,
  refreshKey = 0,
  onLanguageChange,
  onSortChange,
  onTopicChange,
  onCategoryChange,
  onClearQuery,
  health
}) {
  const [videos, setVideos] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [subtopic, setSubtopic] = useState('');
  const sentinelRef = useRef(null);
  const notify = useToast();

  const isBhagwan = topic === 'bhagwan';
  const effectiveQuery = isBhagwan && !query ? subtopic : query;
  const activeCategory = isBhagwan ? 'All' : category;

  useEffect(() => {
    if (!isBhagwan) setSubtopic('');
  }, [isBhagwan, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    setVideos([]);
    setNextToken(null);

    api
      .search({ q: effectiveQuery, language, sort, category: activeCategory, topic, limit: 24 }, { signal: controller.signal })
      .then(data => {
        rememberVideos(data.videos);
        setVideos(data.videos || []);
        setNextToken(data.nextPageToken || null);
        setMode(data.mode || '');
        setStatus('ready');
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setStatus('error');
      });

    return () => controller.abort();
  }, [effectiveQuery, language, sort, activeCategory, topic, attempt, refreshKey]);

  const loadMore = useCallback(async () => {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api.search({ q: effectiveQuery, language, sort, category: activeCategory, topic, pageToken: nextToken, limit: 24 });
      rememberVideos(data.videos);
      setVideos(current => {
        const seen = new Set(current.map(video => video.id));
        const fresh = (data.videos || []).filter(video => !seen.has(video.id));
        return fresh.length ? [...current, ...fresh] : current;
      });
      setNextToken(data.nextPageToken || null);
      setMode(data.mode || mode);
    } catch (err) {
      if (err.status === 429) {
        notify('Thoda wait karo — server busy hai. 10 second baad niche "Load more" dabao.', 'error');
      } else {
        notify(err.message || 'Aur videos load nahi ho paye.', 'error');
      }
    } finally {
      setLoadingMore(false);
    }
  }, [nextToken, loadingMore, effectiveQuery, language, sort, activeCategory, topic, mode, notify]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextToken || status !== 'ready') return undefined;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextToken, loadMore, status]);

  const heading = isBhagwan
    ? 'ॐ Bhagwan Shows & Videos'
    : query
      ? `Results for “${query}”`
      : language === 'hi'
        ? 'हिंदी वीडियो'
        : language === 'en'
          ? 'English videos'
          : 'Hindi + English videos';

  const languageLabel = isBhagwan
    ? 'ॐ Bhagwan — Mahabharat • Ramayan • Upanishad'
    : language === 'hi'
      ? 'हिंदी preference'
      : language === 'en'
        ? 'English preference'
        : 'हिंदी + English mix';

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Discover • Learn • Explore</p>
          <h1>
            Watch what you <em>love.</em>
          </h1>
          <p className="hero-sub">
            Hindi aur English videos — sirf 2023 se pehle wali purani videos, educational pehle. Search, watch,
            like karo aur apni playlists banao.
          </p>
          <div className="hero-chips">
            <span className="chip">
              <span
                className={`status-dot ${
                  health == null ? '' : health.ok ? (health.mode === 'live' ? 'live' : 'public') : 'off'
                }`}
              />
              {health == null
                ? 'Connecting…'
                : health.ok
                  ? health.mode === 'live'
                    ? 'Live YouTube API'
                    : 'Key-free mode'
                  : 'Server offline'}
            </span>
            <span className="chip">
              <Languages size={14} />
              {languageLabel}
            </span>
            <span className="chip" title="Sirf 2023 se pehle ki videos">
              🕰️ 2023 se pehle only
            </span>
            <span className="chip">
              <Sparkles size={14} />
              No login needed
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-glow" />
          <span className="hero-play">
            <Play size={38} fill="currentColor" />
          </span>
          <span className="float-pill float-a">▶ 4K docs</span>
          <span className="float-pill float-b">♪ music</span>
          <span className="float-pill float-c">🕰️ old docs</span>
        </div>
      </section>

      <div className="filter-bar">
        <div className="filter-left">
          <div className="lang-tabs" role="tablist" aria-label="Video language">
            {[
              { value: 'all', label: 'All', hint: 'Hindi + English mixed' },
              { value: 'hi', label: 'हिंदी', hint: 'Sirf Hindi videos' },
              { value: 'en', label: 'English', hint: 'Sirf English videos' }
            ].map(tab => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={language === tab.value}
                className={`lang-tab ${language === tab.value ? 'selected' : ''}`}
                onClick={() => onLanguageChange?.(tab.value)}
                title={tab.hint}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`bhagwan-tab ${isBhagwan ? 'selected' : ''}`}
            onClick={() => onTopicChange?.(isBhagwan ? 'general' : 'bhagwan')}
            aria-pressed={isBhagwan}
            title="Mahabharat, Ramayan, Upanishad, Ganga, Geeta, Krishna, Shiv aur saare Bhagwan shows/videos"
          >
            <span aria-hidden="true">ॐ</span> Bhagwan
          </button>
        </div>

        <label className="sort-control">
          <span>Sort</span>
          <select value={sort} onChange={event => onSortChange?.(event.target.value)} aria-label="Sort videos">
            <option value="smart">Educational + older</option>
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>

      <p className="filter-note">
        {isBhagwan
          ? 'Bhagwan mode: Mahabharat, Ramayan, Upanishad, Ganga, Geeta, Krishna, Shiv, Hanuman — sirf 2023 se pehle wali videos. AI/template/logo wale hate hue.'
          : 'Sirf 2023 se pehle wali purani videos — AI-generated, template, logo, intro aur status videos hata diye jaate hain. Educational videos pehle.'}
      </p>

      {isBhagwan ? (
        <div className="category-row bhagwan-row" role="tablist" aria-label="Bhagwan subtopics">
          {BHAGWAN_SUBTOPICS.map(item => (
            <button
              key={item.label}
              role="tab"
              aria-selected={subtopic === item.query}
              className={`category-chip ${subtopic === item.query ? 'selected bhagwan-chip' : ''}`}
              onClick={() => setSubtopic(item.query)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="category-row" role="tablist" aria-label="Categories">
          {CATEGORIES.map(item => (
            <button
              key={item}
              role="tab"
              aria-selected={category === item}
              className={`category-chip ${category === item ? 'selected' : ''}`}
              onClick={() => onCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <div className="section-heading">
        <div>
          <h2>{heading}</h2>
          <p>
            {isBhagwan
              ? subtopic
                ? `${subtopic} · purani videos pehle · YouTube se`
                : 'Mahabharat • Ramayan • Upanishad • Ganga • Geeta • Krishna • Shiv · YouTube se'
              : query || category !== 'All'
                ? `${[query, category !== 'All' ? category : ''].filter(Boolean).join(' • ')} · YouTube se`
                : 'YouTube se discover kiye gaye videos'}
          </p>
        </div>
        <div className="heading-actions">
          {query ? (
            <button className="btn btn-ghost small" onClick={onClearQuery}>
              Clear search
            </button>
          ) : null}
          {isBhagwan && subtopic ? (
            <button className="btn btn-ghost small" onClick={() => setSubtopic('')}>
              Sab Bhagwan videos
            </button>
          ) : null}
          <span className="result-count">{videos.length} loaded</span>
          <button
            className="icon-btn"
            onClick={() => setAttempt(value => value + 1)}
            aria-label="Refresh videos"
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      {status === 'loading' ? <SkeletonGrid count={8} /> : null}

      {status === 'error' ? (
        <div className="error-panel">
          <span className="error-icon">
            {health?.ok === false ? <WifiOff size={26} /> : <SearchX size={26} />}
          </span>
          <div>
            <strong>Videos load nahi ho paye</strong>
            <p>{error}</p>
            <ul className="error-hints">
              <li>Backend chal raha hai? Root folder me <code>npm run dev</code> run karo.</li>
              <li>Internet connection check karo.</li>
              <li>Optional: <code>.env</code> me <code>YOUTUBE_API_KEY</code> add karo.</li>
            </ul>
            <button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {status === 'ready' && !videos.length ? (
        <EmptyState
          icon={<SearchX size={30} />}
          title="2023 se pehle wali video nahi mili"
          message="SamTube me sirf 2023 se pehle wali videos dikhti hain. Search badal ke dekho — ya Bhagwan tab me purane shows kholo."
          actionLabel="Sare filters hatao"
          onAction={() => {
            onClearQuery();
            onCategoryChange('All');
            if (isBhagwan) {
              setSubtopic('');
            }
          }}
        />
      ) : null}

      {status === 'ready' && videos.length ? (
        <>
          <div className="video-grid">
            {videos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          <div className="load-more" ref={sentinelRef}>
            {nextToken ? (
              <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more videos'}
              </button>
            ) : null}
          </div>

          {mode === 'public' ? (
            <p className="mode-note">
              Key-free public mode chal raha hai. Zyada reliability ke liye <a href="#/about">API key add karo</a>.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
