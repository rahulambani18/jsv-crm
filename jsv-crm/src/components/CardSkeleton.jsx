// Shimmering placeholder cards for card-list pages (Tasks, Meetings)
// that don't use a <table>, so TableSkeleton's <tr>/<td> markup
// doesn't apply here.
//
// Usage: <CardSkeleton rows={4} />
export default function CardSkeleton({ rows = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="panel" aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px' }}>
          <span className="skeleton-cell" style={{ width: 16, height: 16, borderRadius: 4, marginTop: 3, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="skeleton-cell" style={{ width: `${40 + (r * 11) % 30}%`, height: 14, marginBottom: 10 }} />
            <span className="skeleton-cell" style={{ width: `${60 + (r * 7) % 25}%`, height: 11 }} />
          </div>
        </div>
      ))}
    </>
  )
}
