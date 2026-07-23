// src/components/TallyExportButton.jsx
// Drop-in "Export to Tally" button for the Invoices page.
// Props:
//   invoices   — the full/filtered invoice list to offer for export
//   onExported(ids) — called with the array of invoice ids that were
//                     just exported, so the caller can mark them synced

import { useMemo, useState } from 'react'
import { downloadTallyExportXML, loadSavedLedgerNames, saveLedgerNames } from '../lib/tallyExport.js'

const DEFAULT_LEDGERS = { salesLedger: 'Sales', cgstLedger: 'CGST', sgstLedger: 'SGST', igstLedger: 'IGST', companyName: '' }

export default function TallyExportButton({ invoices, onExported }) {
  const [open, setOpen] = useState(false)
  const [ledgers, setLedgers] = useState(() => ({ ...DEFAULT_LEDGERS, ...(loadSavedLedgerNames() || {}) }))
  const [selected, setSelected] = useState(() => new Set())

  // Only offer invoices that (a) didn't already come from Tally — no
  // point exporting them straight back — and (b) haven't already been
  // exported. Both checks are best-effort: older records may not have
  // these fields set at all, which is treated as "eligible".
  const eligible = useMemo(
    () => invoices.filter((i) => i.source !== 'Tally Import' && i.source !== 'Tally Sync' && !i.tallySyncedAt),
    [invoices]
  )

  function openDialog() {
    setSelected(new Set(eligible.map((i) => i.id)))
    setOpen(true)
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleExport() {
    const toExport = eligible.filter((i) => selected.has(i.id))
    if (toExport.length === 0) return
    saveLedgerNames(ledgers)
    downloadTallyExportXML(toExport, ledgers)
    onExported(toExport.map((i) => i.id))
    setOpen(false)
  }

  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={openDialog} title="Export invoices to a Tally-importable XML file">
        📤 Export to Tally
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,30,61,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 0, maxWidth: 560, width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--paper-200)' }}>
              <h3 style={{ margin: 0 }}>Export invoices to Tally</h3>
            </div>

            <div style={{ padding: '18px 22px', overflowY: 'auto' }}>
              {eligible.length === 0 ? (
                <p style={{ fontSize: 13.5, color: 'var(--ink-500)' }}>
                  No invoices are waiting to be exported — everything eligible has already been sent to Tally.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 0 }}>
                    These ledger names must match your Tally company's chart of accounts <strong>exactly</strong>, or the import will fail on Tally's side. Party ledgers are matched by customer name.
                  </p>
                  <div className="field-row" style={{ marginBottom: 8 }}>
                    <div className="field">
                      <label>Sales ledger</label>
                      <input value={ledgers.salesLedger} onChange={(e) => setLedgers({ ...ledgers, salesLedger: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Tally company name (optional)</label>
                      <input value={ledgers.companyName} onChange={(e) => setLedgers({ ...ledgers, companyName: e.target.value })} placeholder="Leave blank to use whichever company is open" />
                    </div>
                  </div>
                  <div className="field-row" style={{ marginBottom: 16 }}>
                    <div className="field">
                      <label>CGST ledger</label>
                      <input value={ledgers.cgstLedger} onChange={(e) => setLedgers({ ...ledgers, cgstLedger: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>SGST ledger</label>
                      <input value={ledgers.sgstLedger} onChange={(e) => setLedgers({ ...ledgers, sgstLedger: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>IGST ledger</label>
                      <input value={ledgers.igstLedger} onChange={(e) => setLedgers({ ...ledgers, igstLedger: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Invoices to export ({selected.size} of {eligible.length} selected)
                  </div>
                  <div style={{ background: 'var(--paper-50)', borderRadius: 8, padding: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {eligible.map((i) => (
                      <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '6px 6px', borderBottom: '1px solid var(--paper-200)', color: 'var(--ink-700)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                        {i.invoiceNo} — {i.company} — ₹{Number(i.total).toLocaleString('en-IN')}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--paper-200)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              {eligible.length > 0 && (
                <button className="btn btn-primary" onClick={handleExport} disabled={selected.size === 0}>
                  Download XML ({selected.size})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
