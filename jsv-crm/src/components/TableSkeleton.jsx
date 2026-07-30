// Shimmering placeholder rows shown in a <table> body while data loads,
// in place of a plain "Loading…" text row.
//
// Usage: <TableSkeleton cols={9} rows={6} />
export default function TableSkeleton({ cols = 5, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <span
                className="skeleton-cell"
                style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
