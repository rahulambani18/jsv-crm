import { useState } from 'react'
import Dropdown from './Dropdown.jsx'

const OTHER_VALUE = '__other__'

/**
 * A custom-styled dropdown that includes an "Other (type manually)"
 * option. When chosen, swaps to a free-text <input> so the user can
 * enter a value not in the list. Used for Industry, Product interest,
 * etc. across multiple forms.
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

  const dropdownOptions = [...options, { value: OTHER_VALUE, label: 'Other (type manually)…' }]

  return (
    <Dropdown
      options={dropdownOptions}
      value={isCustomValue ? OTHER_VALUE : value}
      placeholder={placeholder}
      onChange={(v) => {
        if (v === OTHER_VALUE) {
          setManualMode(true)
          onChange('')
        } else {
          onChange(v)
        }
      }}
    />
  )
}
