import { useState } from 'react'
import Modal from './Modal.jsx'
import { waLink, mailtoLink } from '../lib/messaging.js'
import { showToast } from '../lib/toast.js'

// Generic "share this text" modal — used by Reports to send the
// current summary via email or WhatsApp. There's no fixed recipient
// (unlike Invoices/Quotations, which send to a known customer), so
// this collects an email/phone on the spot, same wa.me/mailto
// no-backend approach as everywhere else in the app.
export default function ReportShareModal({ open, onClose, subject, message }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  if (!open) return null

  function sendEmail() {
    const link = mailtoLink(email.trim(), subject, message)
    if (!link) { showToast('Enter an email address first', 'error'); return }
    window.location.href = link
  }

  function sendWhatsApp() {
    const link = waLink(phone.trim(), message)
    if (!link) { showToast('Enter a WhatsApp number first', 'error'); return }
    window.open(link, '_blank', 'noopener')
  }

  return (
    <Modal title="Share Report" onClose={onClose}>
      <div className="field">
        <label>Preview</label>
        <textarea rows={7} readOnly value={message} style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </div>
        <div className="field">
          <label>WhatsApp number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={sendEmail}>📧 Email Report</button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={sendWhatsApp}>🟢 WhatsApp Report</button>
      </div>
    </Modal>
  )
}
