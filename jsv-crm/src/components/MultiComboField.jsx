import { useState } from 'react'
import { IconX } from './Icons.jsx'
import Dropdown from './Dropdown.jsx'

/**
 * Tag-style multi-select: pick from a dropdown of known products, or type
 * a custom one and press Enter/Add. Selected items show as removable chips.
 * Used for "Products of interest" on Leads, Customers, and Samples forms.
 */
export default function MultiComboField({ options, value = [], onChange, placeholder = 'Add a product…' }) {
  const [draft, setDraft] = useState('')

  function addItem(item) {
    const trimmed = item.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setDraft('')
  }

  function removeItem(item) {
    onChange(value.filter((v) => v !== item))
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {value.map((item) => (
            <span key={item} className="pill pill-navy" style={{ gap: 6 }}>
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                style={{ display: 'flex', background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer' }}
                aria-label={`Remove ${item}`}
              >
                <IconX width={11} height={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <Dropdown
            options={options.filter((o) => !value.includes(o))}
            value=""
            placeholder={placeholder}
            onChange={(v) => { if (v) addItem(v) }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(draft) } }}
          placeholder="Or type a product name and press Enter"
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => addItem(draft)}>Add</button>
      </div>
    </div>
  )
}
