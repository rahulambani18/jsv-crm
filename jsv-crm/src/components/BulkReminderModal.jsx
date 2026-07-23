import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { getTemplates, renderTemplate } from '../lib/templateLibrary.js'
import { waLink, mailtoLink } from '../lib/messaging.js'
import { showToast } from '../lib/toast.js'

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

// Opened from the Invoices bulk-actions bar ("Send Payment Reminders").
// Lists one row per company with an overdue balance — aggregated across
// all of their overdue invoices via credit.js so a customer with three
// unpaid invoices gets one reminder, not three — and lets the rep fire
// off a WhatsApp/email reminder to each with a click, using the same
// Payment Reminder template library as the per-record Send buttons
// elsewhere in the app.
//
// There's no bulk-send API for wa.me/mailto (that needs WhatsApp
// Business or an email service, neither of which this app has), so
// this is a fast checklist rather than a single "send all" button —
// each row is sent individually and gets checked off as you go, so a
// rep can work down the overdue list in one sitting instead of
// re-opening each invoice.
export default function BulkReminderModal({ open, onClose, rows, onDone }) {
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState(null)
  const [sent, setSent] = useState(new Set())

  useEffect(() => {
    if (!open) return
    const list = getTemplates('paymentReminder')
    setTemplates(list)
    setTemplateId(list[0]?.id || null)
    setSent(new Set())
  }, [open])

  if (!open) return null

  const template = templates.find((t) => t.id === templateId) || templates[0]

  function markSent(key) {
    setSent((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  function sendWhatsApp(row) {
    const msg = renderTemplate(template?.whatsapp, { company: row.company, outstanding: formatINR(row.outstanding) })
    const link = waLink(row.phone, msg)
    if (!link) return
    window.open(link, '_blank', 'noopener')
    markSent(row.company)
  }

  function sendEmail(row) {
    const subject = renderTemplate(template?.subject, { company: row.company, outstanding: formatINR(row.outstanding) })
    const body = renderTemplate(template?.body, { company: row.company, outstanding: formatINR(row.outstanding) })
    const link = mailtoLink(row.email, subject, body)
    if (!link) return
    window.location.href = link
    markSent(row.company)
  }

  function handleDone() {
    if (sent.size > 0) {
      showToast(`Reminders sent to ${sent.size} of ${rows.length} compan${rows.length === 1 ? 'y' : 'ies'}`)
    }
    onDone?.(sent)
    onClose()
  }

  return (
    <Modal
      title={`Send payment reminders — ${rows.length} compan${rows.length === 1 ? 'y' : 'ies'}`}
      onClose={handleDone}
      footer={
        <button type="button" className="btn btn-primary" onClick={handleDone}>
          Done{sent.size > 0 ? ` (${sent.size} sent)` : ''}
        </button>
      }
    >
      {templates.length > 1 && (
        <div className="field" style={{ marginBottom: 14 }}>
          <label>Template</label>
          <select value={templateId || ''} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-400)' }}>No companies to remind.</p>
        ) : rows.map((row) => {
          const isSent = sent.has(row.company)
          const hasPhone = !!row.phone
          const hasEmail = !!row.email
          return (
            <div
              key={row.company}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 10px', border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-sm)',
                opacity: isSent ? 0.55 : 1,
              }}
            >
              <span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{row.company}</span>
                <br />
                <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                  {formatINR(row.outstanding)} outstanding · {row.invoiceCount} invoice{row.invoiceCount === 1 ? '' : 's'} overdue
                  {!hasPhone && !hasEmail && ' · no contact on file'}
                </span>
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {isSent && <span style={{ fontSize: 12, color: 'var(--teal-700)', marginRight: 4 }}>✓ Sent</span>}
                <button
                  type="button" className="btn btn-ghost btn-sm" disabled={!hasEmail}
                  title={hasEmail ? 'Send via Email' : 'No email on file'}
                  onClick={() => sendEmail(row)}
                >✉️</button>
                <button
                  type="button" className="btn btn-ghost btn-sm" disabled={!hasPhone}
                  title={hasPhone ? 'Send via WhatsApp' : 'No phone number on file'}
                  onClick={() => sendWhatsApp(row)}
                >💬</button>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
