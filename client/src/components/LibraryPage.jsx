import { Clock3, Heart, Trash2 } from 'lucide-react';
import {
  clearHistory,
  clearLikes,
  likedStore,
  removeFromHistory,
  useHistory,
  useLikes
} from '../lib/store';
import { useToast } from './Toast';
import VideoCard from './VideoCard';
import EmptyState from './EmptyState';

export default function LibraryPage({ type }) {
  const history = useHistory();
  const liked = useLikes();
  const notify = useToast();

  const isHistory = type === 'history';
  const items = isHistory ? history : liked;
  const title = isHistory ? 'Watch history' : 'Liked videos';
  const subtitle = isHistory
    ? 'Jo videos tumne dekhi — sab tumhare browser me save hai.'
    : 'Jo videos pasand aayi — yahan se dobara dekho.';
  const Icon = isHistory ? Clock3 : Heart;

  function clearAll() {
    if (!items.length) return;
    const label = isHistory ? 'Poori watch history' : 'Saare liked videos';
    if (!window.confirm(`${label} clear karni hai? Ye action undo nahi hoga.`)) return;
    if (isHistory) clearHistory();
    else clearLikes();
    notify(`${label} clear ho gayi.`, 'success');
  }

  function removeItem(video) {
    if (isHistory) {
      removeFromHistory(video.id);
    } else {
      likedStore.set(current => current.filter(item => item.id !== video.id));
    }
    notify(isHistory ? 'History se hata diya.' : 'Liked videos se hata diya.');
  }

  return (
    <div className="page">
      <header className="library-head">
        <div className="library-title">
          <span className="library-icon">
            <Icon size={24} />
          </span>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="heading-actions">
          <span className="result-count">{items.length} videos</span>
          {items.length ? (
            <button className="btn btn-ghost small" onClick={clearAll}>
              <Trash2 size={15} /> Clear all
            </button>
          ) : null}
        </div>
      </header>

      {items.length ? (
        <div className="video-grid">
          {items.map(video => (
            <VideoCard key={video.id} video={video} onRemove={removeItem} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon size={30} />}
          title={isHistory ? 'History abhi khaali hai' : 'Abhi koi liked video nahi'}
          message={
            isHistory
              ? 'Jab bhi koi video kholo, wo automatically yahan aa jayegi.'
              : 'Video par heart dabao — wo yahan save ho jayegi.'
          }
          actionLabel="Videos explore karo"
          onAction={() => {
            window.location.hash = '#/';
          }}
        />
      )}
    </div>
  );
}
