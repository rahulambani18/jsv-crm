import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Modal from './Modal.jsx'
import { buildUpiLink, isLikelyVpa } from '../lib/upi.js'
import { waLink, mailtoLink } from '../lib/messaging.js'
import { showToast } from '../lib/toast.js'

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

// Opened from the Invoices row menu. Builds a real UPI payment link
// (upi://pay?...) for the balance due on this invoice — works with
// any UPI app once a valid VPA is entered. No payment-gateway account
// needed for this part; it's just the standard UPI URI scheme.
export default function PaymentLinkModal({ invoice, balanceDue, customer, onClose, onSaveVpa }) {
  const [vpa, setVpa] = useState(invoice.upiVpa || '')
  const [link, setLink] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    const built = buildUpiLink({ vpa, payeeName: 'JSV Ingredient', amount: balanceDue, note: invoice.invoiceNo })
    setLink(built)
    setQrDataUrl(null)
    if (built) {
      QRCode.toDataURL(built, { width: 180, margin: 1 }).then((url) => { if (!cancelled) setQrDataUrl(url) }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [vpa, balanceDue, invoice.invoiceNo])

  function handleCopy() {
    if (!link) return
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      showToast('Payment link copied')
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleSaveVpa() {
    if (!isLikelyVpa(vpa)) { showToast('Enter a valid UPI ID first (e.g. name@bank)', 'error'); return }
    onSaveVpa(vpa)
  }

  const message = `Hi, this is JSV Ingredient. Please pay ${formatINR(balanceDue)} for invoice ${invoice.invoiceNo} using this link: ${link || ''}`
  const wa = link ? waLink(customer?.mobile, message) : null
  const mail = link ? mailtoLink(customer?.email, `Payment link — Invoice ${invoice.invoiceNo}`, message) : null

  return (
    <Modal
      title={`Payment Link — ${invoice.invoiceNo}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-secondary" disabled={!mail} title={mail ? '' : 'No email on file'} onClick={() => mail && (window.location.href = mail)}>✉️ Email link</button>
          <button className="btn btn-primary" disabled={!wa} title={wa ? '' : 'No phone number on file'} onClick={() => wa && window.open(wa, '_blank', 'noopener')}>💬 WhatsApp link</button>
        </>
      }
    >
      <div className="field">
        <label>Business UPI ID (VPA)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="e.g. jsvingredient@okhdfcbank" style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleSaveVpa}>Save</button>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>Saved to this invoice so it's remembered next time.</span>
      </div>

      <div className="field">
        <label>Amount</label>
        <input value={formatINR(balanceDue)} disabled />
      </div>

      {!link ? (
        <p style={{ fontSize: 13, color: 'var(--ink-500)' }}>Enter a valid UPI ID above to generate a payment link and QR code.</p>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          {qrDataUrl && <img src={qrDataUrl} alt="UPI QR" width={150} height={150} style={{ border: '1px solid var(--paper-200)', borderRadius: 8 }} />}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 4 }}>Scan with any UPI app, or share the link:</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input readOnly value={link} className="cell-mono" style={{ fontSize: 11, flex: 1 }} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>{copied ? '✓' : 'Copy'}</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
