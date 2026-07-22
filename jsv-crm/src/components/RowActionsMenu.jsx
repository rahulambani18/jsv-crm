import { useEffect, useRef, useState } from 'react'

// Collapses a row of icon buttons (Edit, Delete, Send via WhatsApp, etc.)
// into a single "⋮" trigger, so wide tables with many possible row
// actions don't force horizontal scrolling just for the Actions column.
//
// items: array of either
//   { label, icon, onClick, danger?, disabled?, disabledReason? }
//   or 'divider' to render a thin separator line between groups.
export default function RowActionsMenu({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function handleKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title="More actions"
        style={{ fontSize: 15, padding: '4px 8px', lineHeight: 1 }}
      >
        ⋮
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            background: '#fff', border: '1px solid var(--paper-200)', borderRadius: 8,
            boxShadow: '0 6px 20px rgba(15,30,61,0.14)', minWidth: 168, zIndex: 50,
            padding: 4,
          }}
        >
          {items.map((item, i) =>
            item === 'divider' ? (
              <div key={i} style={{ height: 1, background: 'var(--paper-200)', margin: '4px 2px' }} />
            ) : (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                title={item.disabled ? item.disabledReason : undefined}
                onClick={(e) => {
                  e.stopPropagation()
                  if (item.disabled) return
                  item.onClick()
                  setOpen(false)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 10px', fontSize: 12.5, textAlign: 'left', border: 'none',
                  background: 'transparent', borderRadius: 5, cursor: item.disabled ? 'not-allowed' : 'pointer',
                  color: item.disabled ? 'var(--ink-300)' : item.danger ? 'var(--red-600)' : 'var(--ink-700)',
                }}
                onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--paper-50)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
