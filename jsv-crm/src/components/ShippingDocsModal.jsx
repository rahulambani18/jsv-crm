import { useState } from 'react'
import Modal from './Modal.jsx'
import { showToast } from '../lib/toast.js'

// Checklist for the four shipping documents an order needs once it's
// dispatched: Invoice, LR Copy, E-way Bill, POD (proof of delivery).
// `doc` values are booleans keyed by SHIPPING_DOC_FIELDS' keys — a
// missing/undefined key is treated as "not collected".
export const SHIPPING_DOC_FIELDS = [
  { key: 'invoice', label: 'Invoice' },
  { key: 'lrCopy', label: 'LR Copy' },
  { key: 'eway', label: 'E-way Bill' },
  { key: 'pod', label: 'POD' },
]

export function docsCollectedCount(shippingDocs) {
  return SHIPPING_DOC_FIELDS.filter((f) => shippingDocs?.[f.key]).length
}

export default function ShippingDocsModal({ order, onClose, onSave }) {
  const [docs, setDocs] = useState(() => {
    const base = {}
    SHIPPING_DOC_FIELDS.forEach((f) => { base[f.key] = !!order.shippingDocs?.[f.key] })
    return base
  })
  const [saving, setSaving] = useState(false)

  function toggle(key) {
    setDocs((d) => ({ ...d, [key]: !d[key] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(docs)
      showToast(`Shipping documents updated for ${order.orderNo || order.poNumber || 'order'}`)
      onClose()
    } catch (err) {
      showToast('Could not update shipping documents: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Shipping Documents — ${order.company}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <p className="sub" style={{ marginTop: -4, marginBottom: 14 }}>
        {order.poNumber ? `PO ${order.poNumber} · ` : ''}{order.orderNo}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SHIPPING_DOC_FIELDS.map((f) => (
          <label
            key={f.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, cursor: 'pointer',
              background: docs[f.key] ? 'var(--teal-50, rgba(13,148,136,0.08))' : 'transparent',
            }}
          >
            <input type="checkbox" checked={docs[f.key]} onChange={() => toggle(f.key)} style={{ width: 16, height: 16, accentColor: 'var(--teal-600)' }} />
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{f.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: docs[f.key] ? 'var(--teal-600)' : 'var(--ink-300)' }}>
              {docs[f.key] ? 'Collected' : 'Missing'}
            </span>
          </label>
        ))}
      </div>
    </Modal>
  )
}
