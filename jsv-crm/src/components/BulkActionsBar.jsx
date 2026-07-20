// Shown above a table when one or more rows are selected via the
// header/row checkboxes. `children` lets each page add its own extra
// controls (e.g. a "Change status" dropdown) alongside the standard
// Export / Delete / Clear buttons.
export default function BulkActionsBar({ count, onClear, onExport, onDelete, children }) {
  if (!count) return null
  return (
    <div className="bulk-actions-bar">
      <span className="bulk-count">{count} selected</span>
      {children}
      {onExport && (
        <button className="btn btn-ghost-light" onClick={onExport}>Export</button>
      )}
      {onDelete && (
        <button className="btn btn-danger" onClick={onDelete}>Delete</button>
      )}
      <button className="btn btn-ghost-light" onClick={onClear}>Clear selection</button>
    </div>
  )
}
