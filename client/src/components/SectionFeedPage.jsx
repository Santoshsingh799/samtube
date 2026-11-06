import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Pencil,
  Pin,
  RefreshCw,
  Search,
  SearchX,
  Loader2,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { useToast } from './Toast';
import VideoCard from './VideoCard';
import { SkeletonGrid } from './Skeleton';
import EmptyState from './EmptyState';
import { rememberVideos } from '../lib/videoCache';

const MODE_LABEL = { strict: 'Strict', balanced: 'Balanced', discovery: 'Discovery', custom: 'Custom' };

export default function SectionFeedPage({ id }) {
  const [section, setSection] = useState(null);
  const [videos, setVideos] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [sort, setSort] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [explainFor, setExplainFor] = useState(null); // video id | null
  const [explainData, setExplainData] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const sentinelRef = useRef(null);
  const notify = useToast();

  useEffect(() => {
    let active = true;
    api.sections.get(id).then(data => {
      if (!active) return;
      setSection(data.section);
      setSort(data.section.sort || 'smart');
    }).catch(() => {});
    return () => { active = false; };
  }, [id]);

  const fetchFeed = useCallback(async (pageToken) => {
    const data = await api.sections.feed({ id, q: appliedQuery, pageToken, limit: 24, sort });
    return data;
  }, [id, appliedQuery, sort]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    setVideos([]);
    setNextToken(null);
    setExplainFor(null);
    setExplainData(null);

    api.sections
      .feed({ id, q: appliedQuery, limit: 24, sort }, { signal: controller.signal })
      .then(data => {
        rememberVideos(data.videos || []);
        setVideos(data.videos || []);
        setNextToken(data.nextPageToken || null);
        setStatus('ready');
        if (data.needsSetup) notify('Is section me topics/keywords add karo — pehle filters set karo.', 'info');
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setStatus('error');
      });
    return () => controller.abort();
  }, [id, appliedQuery, sort, attempt, notify]);

  const loadMore = useCallback(async () => {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchFeed(nextToken);
      rememberVideos(data.videos || []);
      setVideos(current => {
        const seen = new Set(current.map(video => video.id));
        const fresh = (data.videos || []).filter(video => !seen.has(video.id));
        return fresh.length ? [...current, ...fresh] : current;
      });
      setNextToken(data.nextPageToken || null);
    } catch (err) {
      notify(err.message || 'Aur videos load nahi ho paye.', 'error');
    } finally {
      setLoadingMore(false);
    }
  }, [nextToken, loadingMore, fetchFeed, notify]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextToken || status !== 'ready') return undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: '600px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextToken, loadMore, status]);

  async function toggleExplain(video) {
    if (explainFor === video.id) {
      setExplainFor(null);
      setExplainData(null);
      return;
    }
    setExplainFor(video.id);
    setExplainLoading(true);
    setExplainData(null);
    try {
      const data = await api.sections.explain(id, video);
      setExplainData(data);
    } catch (err) {
      setExplainData({ included: true, score: null, why: [err.message] });
    } finally {
      setExplainLoading(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setAppliedQuery(query.trim());
  }

  const feedTitle = section ? `${section.icon} ${section.name}` : 'Section feed';

  return (
    <div className="page">
      <div className="section-feed-head">
        <button className="btn btn-ghost small back-btn" onClick={() => navigate('/sections')}>
          <ArrowLeft size={16} /> My Sections
        </button>
        <div className="section-feed-title">
          <h1>{feedTitle}</h1>
          <div className="section-feed-badges">
            {section ? <span className="mini-chip mode">{MODE_LABEL[section.mode] || section.mode}</span> : null}
            {section ? <span className="mini-chip">{section.language === 'all' ? 'हिंदी + EN' : section.language === 'hi' ? 'हिंदी' : 'English'}</span> : null}
            {section?.pinned ? <span className="mini-chip pin"><Pin size={11} /> pinned</span> : null}
            {section ? <span className="mini-chip dim">{(section.includeTopics?.length || 0) + (section.includeKeywords?.length || 0)} include · {(section.excludeTopics?.length || 0) + (section.excludeKeywords?.length || 0)} exclude</span> : null}
          </div>
          {section?.description ? <p className="page-sub">{section.description}</p> : null}
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost small" onClick={() => setShowRules(value => !value)} aria-expanded={showRules}>
            {showRules ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Filter rules
          </button>
          <button className="icon-btn" onClick={() => setAttempt(value => value + 1)} aria-label="Refresh feed" title="Refresh">
            <RefreshCw size={17} />
          </button>
          <button className="btn btn-primary small" onClick={() => navigate(`/sections/${id}/edit`)}>
            <Pencil size={15} /> Edit
          </button>
        </div>
      </div>

      {showRules && section ? (
        <div className="rules-panel">
          <div className="rules-col">
            <h4>Includes</h4>
            <p>{[...(section.includeTopics || []), ...(section.includeKeywords || [])].join(', ') || '— (open)'}</p>
          </div>
          <div className="rules-col">
            <h4>Excludes</h4>
            <p>{[...(section.excludeTopics || []), ...(section.excludeKeywords || [])].join(', ') || '—'}</p>
          </div>
          <div className="rules-col">
            <h4>Preferred channels</h4>
            <p>{(section.preferredChannels || []).join(', ') || '—'}</p>
          </div>
          <div className="rules-col">
            <h4>Blocked channels</h4>
            <p>{(section.blockedChannels || []).join(', ') || '—'}</p>
          </div>
          <div className="rules-col">
            <h4>Threshold</h4>
            <p>{section.relevanceThreshold}/100 · duration: {section.minDurationSec != null || section.maxDurationSec != null ? `${section.minDurationSec ?? 0}s–${section.maxDurationSec ?? '∞'}` : 'any'}</p>
          </div>
        </div>
      ) : null}

      <div className="feed-toolbar">
        <form onSubmit={submitSearch} className="search-inline feed-search">
          <Search size={16} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search within this section…"
            aria-label="Search within this section"
          />
          {query ? (
            <button type="button" onClick={() => { setQuery(''); setAppliedQuery(''); }} aria-label="Clear search"><X size={14} /></button>
          ) : null}
        </form>
        <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort feed" className="feed-sort">
          <option value="smart">Best match</option>
          <option value="popular">Most views</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {status === 'loading' ? <SkeletonGrid count={8} /> : null}

      {status === 'error' ? (
        <div className="error-panel">
          <div>
            <strong>Feed load nahi ho paya</strong>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>Try again</button>
          </div>
        </div>
      ) : null}

      {status === 'ready' && !videos.length ? (
        <EmptyState
          icon={<SearchX size={30} />}
          title="Is section ke filters match nahi kiye"
          message={
            appliedQuery
              ? `No matches for "${appliedQuery}" inside this section. Search clear karke dekho ya Section edit karke filters thode relax karo.`
              : 'Strict rules ne sab candidates reject kar diye. Add topics/keywords, ya mode ko Discovery karke dekho — ya Section edit karo.'
          }
          actionLabel="Edit section filters"
          onAction={() => navigate(`/sections/${id}/edit`)}
        />
      ) : null}

      {status === 'ready' && videos.length ? (
        <>
          <div className="video-grid section-feed-grid">
            {videos.map(video => (
              <div key={video.id} className="feed-cell">
                <VideoCard video={video} />
                <button className="why-btn" onClick={() => toggleExplain(video)} aria-expanded={explainFor === video.id} title="Why am I seeing this?">
                  <HelpCircle size={14} /> Why?
                </button>
                {explainFor === video.id ? (
                  <div className="why-panel">
                    {explainLoading ? <span className="why-loading"><Loader2 size={13} className="spin" /> Evaluating…</span> : null}
                    {explainData ? (
                      <>
                        <div className="why-score">
                          <strong>{explainData.score ?? '—'}</strong>
                          <span>/100 relevance</span>
                          {explainData.matchedTopics?.length ? <span className="mini-chip">{explainData.matchedTopics.join(' · ')}</span> : null}
                        </div>
                        <ul>
                          {(explainData.why || []).map((reason, index) => <li key={index}>{reason}</li>)}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="load-more" ref={sentinelRef}>
            {nextToken ? (
              <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
