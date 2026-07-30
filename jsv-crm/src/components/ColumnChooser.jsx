import { useEffect, useState, useRef } from 'react'

// Drop-in column visibility + reorder control for a table.
//
// `columns` — full list of choosable columns: [{ key, label }]
// `storageKey` — localStorage key this table's choice is saved under
//   (e.g. "jsv_cols_customers"), so the layout survives a refresh.
//
// Returns via `onChange(order)` the ordered list of *visible* keys,
// which the page uses to decide what to render, in what sequence.
// Columns not passed to `columns` (checkboxes, an Actions column, etc.)
// stay outside the chooser and are always rendered by the page itself.
export default function ColumnChooser({ columns, storageKey, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const [order, setOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (saved && Array.isArray(saved.order)) {
        // Keep only keys that still exist in `columns`, append any new ones
        const known = columns.map((c) => c.key)
        const kept = saved.order.filter((k) => known.includes(k.key ?? k))
        const keptKeys = kept.map((k) => (typeof k === 'string' ? k : k.key))
        const missing = known.filter((k) => !keptKeys.includes(k))
        return [
          ...kept.map((k) => (typeof k === 'string' ? { key: k, visible: true } : k)),
          ...missing.map((k) => ({ key: k, visible: true })),
        ]
      }
    } catch { /* ignore corrupt storage */ }
    return columns.map((c) => ({ key: c.key, visible: true }))
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ order }))
    onChange(order.filter((o) => o.visible).map((o) => o.key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(key) {
    setOrder((o) => o.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)))
  }
  function move(key, dir) {
    setOrder((o) => {
      const i = o.findIndex((c) => c.key === key)
      const j = i + dir
      if (j < 0 || j >= o.length) return o
      const next = [...o]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  function reset() {
    setOrder(columns.map((c) => ({ key: c.key, visible: true })))
  }

  const labelFor = (key) => columns.find((c) => c.key === key)?.label || key

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen((v) => !v)} title="Choose columns">
        ⚙ Columns
      </button>
      {open && (
        <div className="col-chooser-panel">
          <div className="col-chooser-header">Show &amp; reorder columns</div>
          <div className="col-chooser-list">
            {order.map((c, i) => (
              <div className="col-chooser-row" key={c.key}>
                <label>
                  <input type="checkbox" checked={c.visible} onChange={() => toggle(c.key)} />
                  {labelFor(c.key)}
                </label>
                <div className="col-chooser-reorder">
                  <button type="button" disabled={i === 0} onClick={() => move(c.key, -1)} title="Move up">▲</button>
                  <button type="button" disabled={i === order.length - 1} onClick={() => move(c.key, 1)} title="Move down">▼</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--paper-100)', padding: '8px 14px' }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={reset}>Reset to default</button>
          </div>
        </div>
      )}
    </div>
  )
}
