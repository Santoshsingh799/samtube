import { useSyncExternalStore } from 'react';

const PREFIX = 'samtube.v1.';

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or disabled — app still works in-memory */
  }
}

function createStore(key, initialValue) {
  let value = read(key, initialValue);
  const listeners = new Set();

  const emit = () => listeners.forEach(listener => listener());

  const store = {
    key,
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? next(value) : next;
      write(key, value);
      emit();
      return value;
    },
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = event => {
        if (event.key !== PREFIX + key) return;
        try {
          value = event.newValue ? JSON.parse(event.newValue) : initialValue;
          emit();
        } catch {
          /* ignore malformed cross-tab data */
        }
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
      };
    }
  };

  return store;
}

export const HISTORY_LIMIT = 200;
export const LIKED_LIMIT = 500;

export const prefsStore = createStore('prefs', {
  language: 'all',
  captionLanguage: 'hi',
  category: 'All',
  sort: 'smart',
  topic: 'general'
});
export const historyStore = createStore('history', []);
export const likedStore = createStore('liked', []);
export const playlistsStore = createStore('playlists', []);

function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export const usePrefs = () => useStore(prefsStore);
export const useHistory = () => useStore(historyStore);
export const useLikes = () => useStore(likedStore);
export const usePlaylists = () => useStore(playlistsStore);

export function slimVideo(video) {
  return {
    id: video.id,
    title: video.title || '',
    channel: video.channel || '',
    channelId: video.channelId || '',
    description: video.description || '',
    thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    publishedAt: video.publishedAt || '',
    publishedText: video.publishedText || '',
    duration: video.duration || '',
    views: video.views || ''
  };
}

export function setPreference(key, value) {
  prefsStore.set(current => ({ ...current, [key]: value }));
}

export function addToHistory(video) {
  if (!video?.id) return;
  const entry = { ...slimVideo(video), watchedAt: Date.now() };
  historyStore.set(current => [entry, ...current.filter(item => item.id !== entry.id)].slice(0, HISTORY_LIMIT));
}

export function removeFromHistory(id) {
  historyStore.set(current => current.filter(item => item.id !== id));
}

export function clearHistory() {
  historyStore.set([]);
}

export function isLiked(id) {
  return likedStore.get().some(item => item.id === id);
}

export function toggleLike(video) {
  if (!video?.id) return false;
  const exists = isLiked(video.id);
  if (exists) {
    likedStore.set(current => current.filter(item => item.id !== video.id));
    return false;
  }
  likedStore.set(current =>
    [{ ...slimVideo(video), likedAt: Date.now() }, ...current.filter(item => item.id !== video.id)].slice(0, LIKED_LIMIT)
  );
  return true;
}

export function clearLikes() {
  likedStore.set([]);
}

export function createPlaylist(name) {
  const cleanName = String(name || '').trim().slice(0, 60);
  if (!cleanName) return null;
  const playlist = {
    id: `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    createdAt: Date.now(),
    videos: []
  };
  playlistsStore.set(current => [...current, playlist]);
  return playlist;
}

export function deletePlaylist(id) {
  playlistsStore.set(current => current.filter(playlist => playlist.id !== id));
}

export function renamePlaylist(id, name) {
  const cleanName = String(name || '').trim().slice(0, 60);
  if (!cleanName) return;
  playlistsStore.set(current =>
    current.map(playlist => (playlist.id === id ? { ...playlist, name: cleanName } : playlist))
  );
}

export function addVideoToPlaylist(playlistId, video) {
  if (!video?.id) return false;
  let added = false;
  playlistsStore.set(current =>
    current.map(playlist => {
      if (playlist.id !== playlistId) return playlist;
      if (playlist.videos.some(item => item.id === video.id)) return playlist;
      added = true;
      return { ...playlist, videos: [...playlist.videos, slimVideo(video)] };
    })
  );
  return added;
}

export function removeVideoFromPlaylist(playlistId, videoId) {
  playlistsStore.set(current =>
    current.map(playlist =>
      playlist.id === playlistId
        ? { ...playlist, videos: playlist.videos.filter(item => item.id !== videoId) }
        : playlist
    )
  );
}
