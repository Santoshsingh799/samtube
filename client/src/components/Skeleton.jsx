export function CardSkeleton() {
  return (
    <div className="video-card skeleton-card" aria-hidden="true">
      <div className="thumb skeleton" />
      <div className="card-body">
        <div className="avatar skeleton" />
        <div className="skeleton-lines">
          <span className="skeleton line w90" />
          <span className="skeleton line w60" />
          <span className="skeleton line w40" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="video-grid">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function WatchSkeleton() {
  return (
    <div className="watch-layout" aria-hidden="true">
      <div className="player-column">
        <div className="player-frame skeleton" />
        <div className="skeleton line w70 mt18" style={{ height: 24 }} />
        <div className="skeleton line w40 mt12" />
        <div className="skeleton block mt18" />
      </div>
      <aside className="related-column">
        <span className="skeleton line w50" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="compact-card skeleton-row" key={index}>
            <span className="skeleton thumb-sm" />
            <span className="skeleton-lines">
              <span className="skeleton line w90" />
              <span className="skeleton line w50" />
            </span>
          </div>
        ))}
      </aside>
    </div>
  );
}
