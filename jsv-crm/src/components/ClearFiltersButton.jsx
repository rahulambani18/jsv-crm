import { IconX } from './Icons.jsx'

// Renders nothing when every filter is already at its default. Pass the
// `meta` objects returned by usePersistedFilter (or any {isDefault} shape)
// plus onClear to reset them all at once.
//
// Also doubles as the page's "filters are active" indicator: the count
// badge makes it obvious at a glance, even before reading the label, that
// something here isn't showing the full unfiltered list.
export default function ClearFiltersButton({ filters = [], onClear }) {
  const activeCount = filters.filter((f) => f && f.isDefault === false).length
  if (activeCount === 0) return null
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onClear} title={`${activeCount} filter${activeCount === 1 ? '' : 's'} active — click to reset`}>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 15, height: 15,
          borderRadius: '100px', background: 'var(--navy-900)', color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '0 4px', marginRight: 6,
        }}
      >
        {activeCount}
      </span>
      <IconX width={13} height={13} /> Clear filters
    </button>
  )
}
