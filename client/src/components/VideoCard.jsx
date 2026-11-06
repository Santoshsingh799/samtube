import { Play, X } from 'lucide-react';
import { handleThumbError, initials, metaLine } from '../lib/format';

export default function VideoCard({ video, onRemove, onOpen, compact = false, badge }) {
  const meta = metaLine(video);

  if (compact) {
    return (
      <div className="compact-card">
        <a
          className="compact-link"
          href={`#/watch/${video.id}`}
          onClick={() => onOpen?.(video)}
          title={video.title}
        >
          <span className="thumb-sm">
            <img
              src={video.thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={event => handleThumbError(event, video.id)}
            />
            {video.duration ? <span className="duration tiny">{video.duration}</span> : null}
          </span>
          <span className="compact-copy">
            <strong>{video.title}</strong>
            <span>{video.channel}</span>
            {meta ? <span className="muted">{meta}</span> : null}
          </span>
        </a>
        {onRemove ? (
          <button className="icon-btn tiny" onClick={() => onRemove(video)} aria-label={`Remove ${video.title}`}>
            <X size={15} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="video-card">
      <a className="video-card-link" href={`#/watch/${video.id}`} onClick={() => onOpen?.(video)}>
        <span className="thumb">
          <img
            src={video.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={event => handleThumbError(event, video.id)}
          />
          {video.duration ? <span className="duration">{video.duration}</span> : null}
          {badge ? <span className="thumb-badge">{badge}</span> : null}
          <span className="play-overlay" aria-hidden="true">
            <Play size={26} fill="currentColor" />
          </span>
        </span>
        <span className="card-body">
          <span className="avatar">{initials(video.channel)}</span>
          <span className="card-copy">
            <strong className="card-title">{video.title}</strong>
            <span className="card-channel">{video.channel}</span>
            {meta ? <span className="card-meta">{meta}</span> : null}
          </span>
        </span>
      </a>
      {onRemove ? (
        <button className="card-remove" onClick={() => onRemove(video)} aria-label={`Remove ${video.title}`}>
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
