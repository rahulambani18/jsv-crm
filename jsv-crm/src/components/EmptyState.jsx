// A polished replacement for plain "No data" text in empty tables —
// icon badge + heading + short subtext + up to two call-to-action
// buttons (e.g. "Import Excel" OR "Create First Lead").
//
// Backward compatible with the old single-action shape (actionLabel /
// onAction) — pass a `secondaryActionLabel` / `onSecondaryAction` pair
// to get a second button separated by a small "OR".
export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  const hasPrimary = actionLabel && onAction
  const hasSecondary = secondaryActionLabel && onSecondaryAction

  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-title">{title}</p>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      {(hasPrimary || hasSecondary) && (
        <div className="empty-state-actions">
          {hasSecondary && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          )}
          {hasPrimary && hasSecondary && <span className="empty-state-or">or</span>}
          {hasPrimary && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
