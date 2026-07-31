import { IconX } from './Icons.jsx'

// Renders nothing when every filter is already at its default. Pass the
// `meta` objects returned by usePersistedFilter (or any {isDefault} shape)
// plus onClear to reset them all at once.
export default function ClearFiltersButton({ filters = [], onClear }) {
  const active = filters.some((f) => f && f.isDefault === false)
  if (!active) return null
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onClear} title="Reset all filters on this page">
      <IconX width={13} height={13} /> Clear filters
    </button>
  )
}
