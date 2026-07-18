import { useEffect, useRef, useState } from 'react'
import { IconChevronDown } from './Icons.jsx'

/**
 * A fully custom-styled dropdown to replace native <select> elements,
 * which render with the browser/OS's own default look (different on
 * every platform, can't be restyled with CSS). This renders its own
 * trigger button and its own option list, so it looks identical and
 * on-brand everywhere.
 *
 * options: array of strings, OR array of { value, label } objects.
 */
export default function Dropdown({ options, value, onChange, placeholder = 'Select…', disabled = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const selected = normalized.find((o) => o.value === value)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function handleKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div ref={ref} className="dropdown-root">
      <button
        type="button"
        className="dropdown-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? '' : 'dropdown-placeholder'}>{selected ? selected.label : placeholder}</span>
        <IconChevronDown width={14} height={14} className={`dropdown-chevron${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="dropdown-panel">
          {normalized.map((opt) => (
            <div
              key={opt.value}
              className={`dropdown-option${opt.value === value ? ' selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              {opt.label}
              {opt.value === value && <span className="dropdown-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
