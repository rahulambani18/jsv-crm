import { useNavigate } from 'react-router-dom'

// Renders "Dashboard > Section > (extra crumb)". `items` is an array of
// { label, to } — the last item is always treated as the current page
// (rendered as plain text, not a link), even if it carries a `to`.
export default function Breadcrumb({ items }) {
  const navigate = useNavigate()
  if (!items || items.length === 0) return null

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span className="breadcrumb-sep">/</span>}
            {isLast || !item.to ? (
              <span className="breadcrumb-item current">{item.label}</span>
            ) : (
              <span
                className="breadcrumb-item"
                role="link"
                tabIndex={0}
                onClick={() => navigate(item.to)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(item.to) }}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
