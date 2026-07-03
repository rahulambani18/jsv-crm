import { useState } from 'react'

const OTHER_VALUE = '__other__'

/**
 * A <select> that includes an "Other (type manually)" option. When chosen,
 * swaps to a free-text <input> so the user can enter a value not in the
 * list. Used for Industry, Product interest, etc. across multiple forms.
 */
export default function ComboField({ options, value, onChange, placeholder = 'Select…' }) {
  const isCustomValue = value && !options.includes(value)
  const [manualMode, setManualMode] = useState(isCustomValue)

  if (manualMode) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a value…"
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => { setManualMode(false); onChange('') }}
          title="Back to dropdown"
        >
          List
        </button>
      </div>
    )
  }

  return (
    <select
      value={isCustomValue ? OTHER_VALUE : value}
      onChange={(e) => {
        if (e.target.value === OTHER_VALUE) {
          setManualMode(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      <option value={OTHER_VALUE}>Other (type manually)…</option>
    </select>
  )
}
