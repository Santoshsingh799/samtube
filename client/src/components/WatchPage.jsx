import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Languages,
  ListVideo,
  Plus,
  RefreshCw,
  WifiOff,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { initials, safeDescription, timeAgo } from '../lib/format';
import { goBack } from '../lib/router';
import {
  addToHistory,
  addVideoToPlaylist,
  createPlaylist,
  historyStore,
  likedStore,
  removeVideoFromPlaylist,
  toggleLike,
  useLikes,
  usePlaylists
} from '../lib/store';
import { getRememberedVideo, rememberVideo, rememberVideos } from '../lib/videoCache';
import { useToast } from './Toast';
import VideoCard from './VideoCard';
import { WatchSkeleton } from './Skeleton';
import EmptyState from './EmptyState';

export default function WatchPage({ id, language, captionLanguage, onCaptionLanguageChange }) {
  const [video, setVideo] = useState(() => getRememberedVideo(id));
  const [related, setRelated] = useState([]);
  const [relatedStatus, setRelatedStatus] = useState('loading');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [descOpen, setDescOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState('');
  const [attempt, setAttempt] = useState(0);
  const popoverRef = useRef(null);

  const liked = useLikes();
  const playlists = usePlaylists();
  const notify = useToast();
  const isLiked = liked.some(item => item.id === id);

  useEffect(() => {
    const controller = new AbortController();
    const fallback =
      getRememberedVideo(id) ||
      historyStore.get().find(item => item.id === id) ||
      likedStore.get().find(item => item.id === id) ||
      null;

    setStatus('loading');
    setError('');
    setDescOpen(false);
    setPlaylistOpen(false);
    setVideo(fallback);
    if (fallback) addToHistory(fallback);
    window.scrollTo({ top: 0, behavior: 'auto' });

    api
      .video(id, { signal: controller.signal })
      .then(data => {
        const merged = {
          ...fallback,
          ...data.video,
          description: data.video.description || fallback?.description || ''
        };
        setVideo(merged);
        rememberVideo(merged);
        addToHistory(merged);
        setStatus('ready');
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        if (fallback) {
          setStatus('ready');
          notify('Details refresh nahi hui — saved info se dikha rahe hain.');
        } else {
          setError(err.message);
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [id, language, attempt, notify]);

  useEffect(() => {
    if (!video?.title) return undefined;
    const controller = new AbortController();
    setRelatedStatus('loading');
    setRelated([]);

    api
      .related(
        { id, title: video.title, channel: video.channel || '', language, limit: 10 },
        { signal: controller.signal }
      )
      .then(data => {
        rememberVideos(data.videos || []);
        setRelated(data.videos || []);
        setRelatedStatus('ready');
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setRelatedStatus('error');
      });

    return () => controller.abort();
  }, [id, language, video?.title, video?.channel]);

  useEffect(() => {
    const onPointerDown = event => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target)) setPlaylistOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== 'Escape') return;
      if (playlistOpen) setPlaylistOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playlistOpen]);

  function handleLike() {
    if (!video) return;
    const nowLiked = toggleLike(video);
    notify(nowLiked ? 'Liked videos me add ho gaya.' : 'Liked videos se hata diya.', nowLiked ? 'success' : 'info');
  }

  async function copyLink() {
    const url = `https://youtu.be/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      notify('Link copy ho gaya.', 'success');
    } catch {
      notify(url, 'info');
    }
  }

  function handleCreatePlaylist(event) {
    event.preventDefault();
    const playlist = createPlaylist(newPlaylist);
    if (!playlist) return;
    if (video) addVideoToPlaylist(playlist.id, video);
    setNewPlaylist('');
    notify(`“${playlist.name}” ban gayi aur video save ho gaya.`, 'success');
  }

  if (status === 'loading' && !video) {
    return (
      <div className="page">
        <WatchSkeleton />
      </div>
    );
  }

  if (status === 'error' && !video) {
    return (
      <div className="page">
        <div className="error-panel standalone">
          <span className="error-icon">
            {error.includes('connect') ? <WifiOff size={26} /> : <RefreshCw size={26} />}
          </span>
          <div>
            <strong>Video load nahi hua</strong>
            <p>{error}</p>
            <div className="inline-actions">
              <button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>
                Try again
              </button>
              <button className="btn btn-ghost" onClick={goBack}>
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) return null;

  const playerLang = language === 'all' ? 'hi' : language;
  const playerSrc = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&cc_load_policy=1&cc_lang_pref=${captionLanguage}&hl=${playerLang}`;
  const description = safeDescription(video.description);

  return (
    <div className="page">
      <button className="back-link" onClick={goBack}>
        <ArrowLeft size={17} /> Back
      </button>

      <div className="watch-layout">
        <div className="player-column">
          <div className="player-frame">
            <iframe
              key={id}
              src={playerSrc}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <p className="player-hint">
            Video yahan na chale?{' '}
            <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">
              YouTube par kholo ↗
            </a>
          </p>

          <h1 className="watch-title">{video.title}</h1>

          <div className="watch-meta-row">
            <div className="channel-info">
              <span className="avatar large">{initials(video.channel)}</span>
              <div>
                <strong>{video.channel}</strong>
                <span>
                  {[video.views, video.publishedText, video.publishedAt ? timeAgo(Date.parse(video.publishedAt)) : '']
                    .filter(Boolean)
                    .join(' • ')}
                </span>
              </div>
            </div>

            <div className="watch-actions">
              <button className={`pill-btn ${isLiked ? 'active' : ''}`} onClick={handleLike} aria-pressed={isLiked}>
                <Heart size={17} fill={isLiked ? 'currentColor' : 'none'} />
                {isLiked ? 'Liked' : 'Like'}
              </button>

              <div className="popover-anchor" ref={popoverRef}>
                <button
                  className={`pill-btn ${playlistOpen ? 'active' : ''}`}
                  onClick={() => setPlaylistOpen(open => !open)}
                  aria-expanded={playlistOpen}
                >
                  <ListVideo size={17} /> Save
                </button>

                {playlistOpen ? (
                  <div className="playlist-popover">
                    <div className="popover-head">
                      <strong>Save to playlist</strong>
                      <button className="icon-btn tiny" onClick={() => setPlaylistOpen(false)} aria-label="Close">
                        <X size={15} />
                      </button>
                    </div>

                    <div className="popover-list">
                      {playlists.length ? (
                        playlists.map(playlist => {
                          const saved = playlist.videos.some(item => item.id === id);
                          return (
                            <button
                              key={playlist.id}
                              className={`popover-item ${saved ? 'saved' : ''}`}
                              onClick={() => {
                                if (saved) {
                                  removeVideoFromPlaylist(playlist.id, id);
                                  notify(`“${playlist.name}” se hata diya.`);
                                } else {
                                  addVideoToPlaylist(playlist.id, video);
                                  notify(`“${playlist.name}” me save ho gaya.`, 'success');
                                }
                              }}
                            >
                              <span>{playlist.name}</span>
                              {saved ? <Check size={16} /> : <Plus size={16} />}
                            </button>
                          );
                        })
                      ) : (
                        <p className="popover-empty">Abhi koi playlist nahi — niche nayi banao.</p>
                      )}
                    </div>

                    <form className="popover-form" onSubmit={handleCreatePlaylist}>
                      <input
                        value={newPlaylist}
                        onChange={event => setNewPlaylist(event.target.value)}
                        placeholder="New playlist name"
                        maxLength={60}
                        aria-label="New playlist name"
                      />
                      <button type="submit" aria-label="Create playlist" disabled={!newPlaylist.trim()}>
                        <Plus size={16} />
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>

              <button className="pill-btn" onClick={copyLink}>
                <Copy size={17} /> Copy
              </button>

              <a
                className="pill-btn"
                href={`https://www.youtube.com/watch?v=${id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={17} /> YouTube
              </a>
            </div>
          </div>

          <div className="caption-bar">
            <span className="caption-label">
              <Languages size={16} /> Captions
            </span>
            <select
              value={captionLanguage}
              onChange={event => onCaptionLanguageChange(event.target.value)}
              aria-label="Caption language preference"
            >
              <option value="hi">Hindi</option>
              <option value="en">English</option>
            </select>
            <span className="caption-help">
              Captions tabhi dikhenge jab video me us language ki track available ho.
            </span>
          </div>

          <div className={`description-box ${descOpen ? 'open' : ''}`}>
            <p>
              {description ||
                'Is video ki description available nahi hai. Poori details ke liye YouTube par kholo.'}
            </p>
            {description.length > 220 ? (
              <button className="desc-toggle" onClick={() => setDescOpen(open => !open)}>
                {descOpen ? 'Show less' : 'Show more'}
              </button>
            ) : null}
          </div>
        </div>

        <aside className="related-column">
          <div className="related-head">
            <h2>Up next</h2>
            <span>{related.length ? `${related.length} related` : 'Related videos'}</span>
          </div>

          {related.length ? (
            <div className="related-list">
              {related.map(item => (
                <VideoCard key={item.id} video={item} compact />
              ))}
            </div>
          ) : relatedStatus === 'loading' ? (
            <p className="muted small">Related videos load ho rahe hain…</p>
          ) : (
            <EmptyState
              icon={<ListVideo size={24} />}
              title="Koi related video nahi"
              message="Home page par wapas jaake aur videos explore karo."
              actionLabel="Go home"
              onAction={() => {
                window.location.hash = '#/';
              }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
