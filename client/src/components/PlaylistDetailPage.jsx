import { ArrowLeft, ListVideo, Play, Trash2 } from 'lucide-react';
import { handleThumbError } from '../lib/format';
import { deletePlaylist, removeVideoFromPlaylist, usePlaylists } from '../lib/store';
import { useToast } from './Toast';
import VideoCard from './VideoCard';
import EmptyState from './EmptyState';

export default function PlaylistDetailPage({ id }) {
  const playlists = usePlaylists();
  const notify = useToast();
  const playlist = playlists.find(item => item.id === id);

  if (!playlist) {
    return (
      <div className="page">
        <EmptyState
          icon={<ListVideo size={30} />}
          title="Playlist nahi mili"
          message="Ho sakta hai ye delete ho gayi ho. Playlists page se nayi banao."
          actionLabel="Playlists kholo"
          onAction={() => {
            window.location.hash = '#/playlists';
          }}
        />
      </div>
    );
  }

  function remove() {
    if (!window.confirm(`“${playlist.name}” playlist delete karni hai?`)) return;
    deletePlaylist(playlist.id);
    notify('Playlist delete ho gayi.');
    window.location.hash = '#/playlists';
  }

  return (
    <div className="page">
      <a className="back-link" href="#/playlists">
        <ArrowLeft size={17} /> All playlists
      </a>

      <header className="playlist-hero">
        <div className="playlist-hero-art">
          {playlist.videos[0] ? (
            <img
              src={playlist.videos[0].thumbnail}
              alt=""
              onError={event => handleThumbError(event, playlist.videos[0].id)}
            />
          ) : (
            <ListVideo size={38} />
          )}
        </div>
        <div className="playlist-hero-copy">
          <p className="eyebrow">Playlist</p>
          <h1>{playlist.name}</h1>
          <p className="muted">
            {playlist.videos.length} video{playlist.videos.length === 1 ? '' : 's'} ·{' '}
            {new Date(playlist.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
          <div className="inline-actions">
            <button
              className="btn btn-primary"
              disabled={!playlist.videos.length}
              onClick={() => {
                window.location.hash = `#/watch/${playlist.videos[0].id}`;
              }}
            >
              <Play size={16} fill="currentColor" /> Play all
            </button>
            <button className="btn btn-ghost" onClick={remove}>
              <Trash2 size={16} /> Delete playlist
            </button>
          </div>
        </div>
      </header>

      {playlist.videos.length ? (
        <div className="video-grid">
          {playlist.videos.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onRemove={item => {
                removeVideoFromPlaylist(playlist.id, item.id);
                notify('Playlist se video hata diya.');
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListVideo size={30} />}
          title="Playlist khaali hai"
          message="Kisi bhi video ko kholo aur “Save” dabake is playlist me add karo."
          actionLabel="Videos explore karo"
          onAction={() => {
            window.location.hash = '#/';
          }}
        />
      )}
    </div>
  );
}
