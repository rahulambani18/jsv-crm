// src/components/TallyImportButton.jsx
// Drop-in "Import from Tally XML" button.
// Props:
//   onImport(records, type) — called with parsed records after successful parse
//   label                  — optional button label override

import { useRef, useState } from 'react'
import { parseTallyXML } from '../lib/tallyImport.js'

export default function TallyImportButton({ onImport, label }) {
  const fileRef = useRef()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const result = await parseTallyXML(file)
      setPreview(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  function handleConfirm() {
    if (!preview) return
    onImport(preview.records, preview.type)
    setPreview(null)
  }

  const typeLabel = {
    customers: 'Customers (Ledgers)',
    invoices: 'Sales Invoices',
    payments: 'Receipts / Payments',
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xml"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        title="Import data from a Tally XML export file"
      >
        {loading ? 'Reading…' : (label || '📥 Import from Tally')}
      </button>

      {error && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,30,61,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, maxWidth: 420, width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 12px', color: 'var(--red-600)' }}>Import Failed</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-700)', marginBottom: 16 }}>{error}</p>
            <div style={{ background: 'var(--paper-50)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.6 }}>
              <strong>How to export from Tally:</strong><br />
              • <strong>Customers:</strong> Gateway → Display → List of Accounts → E: Export → XML<br />
              • <strong>Invoices:</strong> Gateway → Display → Day Book → E: Export → XML → Sales<br />
              • <strong>Payments:</strong> Gateway → Display → Day Book → E: Export → XML → Receipt
            </div>
            <button className="btn btn-primary" onClick={() => setError('')} style={{ width: '100%', justifyContent: 'center' }}>OK</button>
          </div>
        </div>
      )}

      {preview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,30,61,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 0, maxWidth: 520, width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--paper-200)' }}>
              <h3 style={{ margin: 0 }}>✅ Tally XML Parsed Successfully</h3>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ background: 'var(--teal-100)', borderRadius: 10, padding: '12px 20px', textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--teal-700)' }}>{preview.records.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--teal-700)', fontWeight: 600 }}>Records found</div>
                </div>
                <div style={{ background: 'var(--paper-50)', borderRadius: 10, padding: '12px 20px', textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 2 }}>Type detected</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{typeLabel[preview.type] || preview.type}</div>
                </div>
              </div>

              {/* Preview first 5 records */}
              <div style={{ background: 'var(--paper-50)', borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 180, overflowY: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Preview (first 5 records)</div>
                {preview.records.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid var(--paper-200)', color: 'var(--ink-700)' }}>
                    {preview.type === 'customers' && `${r.company} ${r.gst ? `— GSTIN: ${r.gst}` : ''} ${r.city ? `— ${r.city}` : ''}`}
                    {preview.type === 'invoices' && `${r.invoiceNo} — ${r.company} — ₹${Number(r.total).toLocaleString('en-IN')} — ${r.issueDate}`}
                    {preview.type === 'payments' && `${r.company} — ₹${Number(r.amount).toLocaleString('en-IN')} — ${r.date} — ${r.mode}`}
                  </div>
                ))}
                {preview.records.length > 5 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 6 }}>...and {preview.records.length - 5} more</div>
                )}
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginBottom: 0 }}>
                These {preview.records.length} records will be imported. Existing records with the same name will be skipped.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--paper-200)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPreview(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirm}>
                Import {preview.records.length} records
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
