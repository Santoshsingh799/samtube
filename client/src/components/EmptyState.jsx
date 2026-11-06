export default function EmptyState({ icon, title, message, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      <div className="empty-actions">
        {actionLabel ? (
          <button className="btn btn-primary" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
        {secondaryLabel ? (
          <button className="btn btn-ghost" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
