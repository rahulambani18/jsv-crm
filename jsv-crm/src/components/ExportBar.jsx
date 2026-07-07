// src/components/ExportBar.jsx
// Drop-in export bar for any table.
// Props:
//   title     — filename and PDF title (e.g. "Leads")
//   headers   — array of column header strings
//   rows      — array of arrays (each inner array is one row of plain strings)
//   count     — optional record count shown as label

import { useState } from 'react'
import { exportCSV, exportExcel, exportPDF, printTable } from '../lib/exportUtils.js'

export default function ExportBar({ title, headers, rows, count }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen((v) => !v)}
        title="Export table"
      >
        ↓ Export {count !== undefined && <span style={{ color: 'var(--ink-400)', marginLeft: 4 }}>({count})</span>}
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            background: '#fff', border: '1px solid var(--paper-200)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)',
            zIndex: 50, minWidth: 160, overflow: 'hidden',
          }}>
            {[
              { label: '📊 Export Excel', fn: () => exportExcel(title, headers, rows) },
              { label: '📄 Export CSV', fn: () => exportCSV(title, headers, rows) },
              { label: '🖨 Export PDF', fn: () => exportPDF(title, headers, rows) },
              { label: '🖨 Print', fn: () => printTable(title, headers, rows) },
            ].map(({ label, fn }) => (
              <button
                key={label}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '10px 14px', fontSize: 13 }}
                onClick={() => { fn(); setOpen(false) }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
