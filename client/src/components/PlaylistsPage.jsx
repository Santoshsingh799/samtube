import { useState } from 'react';
import { FolderPlus, ListVideo, Play, Plus, Trash2 } from 'lucide-react';
import { handleThumbError } from '../lib/format';
import { createPlaylist, deletePlaylist, usePlaylists } from '../lib/store';
import { useToast } from './Toast';
import EmptyState from './EmptyState';

export default function PlaylistsPage() {
  const playlists = usePlaylists();
  const notify = useToast();
  const [name, setName] = useState('');

  function submit(event) {
    event.preventDefault();
    const playlist = createPlaylist(name);
    if (!playlist) return;
    setName('');
    notify(`“${playlist.name}” playlist ban gayi.`, 'success');
  }

  function remove(playlist) {
    if (!window.confirm(`“${playlist.name}” playlist delete karni hai?`)) return;
    deletePlaylist(playlist.id);
    notify('Playlist delete ho gayi.');
  }

  return (
    <div className="page">
      <header className="library-head">
        <div className="library-title">
          <span className="library-icon">
            <ListVideo size={24} />
          </span>
          <div>
            <h1>Playlists</h1>
            <p>Apni pasand ke videos ko collections me organize karo.</p>
          </div>
        </div>
        <span className="result-count">{playlists.length} playlists</span>
      </header>

      <form className="create-playlist" onSubmit={submit}>
        <FolderPlus size={18} />
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Nayi playlist ka naam…"
          maxLength={60}
          aria-label="Playlist name"
        />
        <button type="submit" className="btn btn-primary small" disabled={!name.trim()}>
          <Plus size={16} /> Create
        </button>
      </form>

      {playlists.length ? (
        <div className="playlist-grid">
          {playlists.map(playlist => {
            const cover = playlist.videos[0];
            return (
              <div className="playlist-card" key={playlist.id}>
                <a className="playlist-cover" href={`#/playlist/${playlist.id}`}>
                  {cover ? (
                    <img
                      src={cover.thumbnail}
                      alt=""
                      loading="lazy"
                      onError={event => handleThumbError(event, cover.id)}
                    />
                  ) : (
                    <span className="playlist-cover-empty">
                      <ListVideo size={28} />
                    </span>
                  )}
                  <span className="playlist-count">
                    <Play size={12} fill="currentColor" /> {playlist.videos.length}
                  </span>
                </a>
                <div className="playlist-body">
                  <a href={`#/playlist/${playlist.id}`} className="playlist-name" title={playlist.name}>
                    {playlist.name}
                  </a>
                  <span className="muted small">
                    {playlist.videos.length} video{playlist.videos.length === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  className="icon-btn tiny danger"
                  onClick={() => remove(playlist)}
                  aria-label={`Delete ${playlist.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<ListVideo size={30} />}
          title="Koi playlist nahi hai"
          message="Upar naam likh ke pehli playlist banao, phir kisi bhi video par “Save” dabao."
          actionLabel="Videos explore karo"
          onAction={() => {
            window.location.hash = '#/';
          }}
        />
      )}
    </div>
  );
}
