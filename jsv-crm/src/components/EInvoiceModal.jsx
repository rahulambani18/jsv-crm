import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Modal from './Modal.jsx'
import { generateEInvoice, qrPayloadFor } from '../lib/eInvoice.js'
import { showToast } from '../lib/toast.js'

// Opened from the Invoices row menu. Generates a demo IRN/Ack/QR and
// saves it on the invoice. See src/lib/eInvoice.js for why this is a
// placeholder rather than a real IRP call.
export default function EInvoiceModal({ invoice, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(invoice.einvoiceQr || null)

  const alreadyGenerated = !!invoice.einvoiceIrn

  useEffect(() => {
    if (invoice.einvoiceIrn && invoice.einvoiceQr) setQrDataUrl(invoice.einvoiceQr)
  }, [invoice])

  async function handleGenerate() {
    setSaving(true)
    try {
      const fields = generateEInvoice(invoice)
      const qr = await QRCode.toDataURL(qrPayloadFor(invoice, fields.einvoiceIrn), { width: 180, margin: 1 })
      await onSave({ ...fields, einvoiceQr: qr })
      setQrDataUrl(qr)
      showToast(`E-Invoice generated for ${invoice.invoiceNo}`)
    } catch (err) {
      showToast('Could not generate e-invoice: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`E-Invoice — ${invoice.invoiceNo}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {!alreadyGenerated && (
            <button className="btn btn-primary" onClick={handleGenerate} disabled={saving}>
              {saving ? 'Generating…' : 'Generate E-Invoice'}
            </button>
          )}
        </>
      }
    >
      <div style={{ background: 'var(--amber-50, #fff8e6)', border: '1px solid var(--amber-200, #f3d98b)', borderRadius: 8, padding: '10px 12px', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
        <strong>Demo mode.</strong> This IRN/Ack No. is generated locally for workflow purposes — it is not registered with the GST Invoice Registration Portal (IRP) and is not a legally valid e-invoice. Connect a GSP (ClearTax, Cygnet, MasterGST, etc.) to issue a real one.
      </div>

      {!alreadyGenerated ? (
        <p style={{ fontSize: 13.5, color: 'var(--ink-500)' }}>
          No e-invoice generated yet for this invoice. Generating one will create an IRN, acknowledgement number and QR code and save them on the invoice.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <table className="data-table" style={{ flex: 1, minWidth: 260 }}>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>IRN</td><td className="cell-mono" style={{ wordBreak: 'break-all', fontSize: 11 }}>{invoice.einvoiceIrn}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Ack No.</td><td className="cell-mono">{invoice.einvoiceAckNo}</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Ack Date</td><td className="cell-mono">{invoice.einvoiceAckDate ? new Date(invoice.einvoiceAckDate).toLocaleString('en-IN') : '—'}</td></tr>
            </tbody>
          </table>
          {qrDataUrl && (
            <div style={{ textAlign: 'center' }}>
              <img src={qrDataUrl} alt="E-Invoice QR" width={140} height={140} style={{ border: '1px solid var(--paper-200)', borderRadius: 8 }} />
              <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>E-Invoice QR</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
