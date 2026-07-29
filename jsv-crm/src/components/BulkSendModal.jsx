import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { getTemplates, renderTemplate } from '../lib/templateLibrary.js'
import { waLink, mailtoLink } from '../lib/messaging.js'
import { showToast } from '../lib/toast.js'

// Generic version of BulkReminderModal — opened from any bulk-actions
// bar's "Send WhatsApp" / "Send Email" buttons. Takes the same
// category/vars shape the per-row SendButtons already use, so the
// same template library and {{placeholders}} apply everywhere.
//
// There's no bulk-send API for wa.me/mailto (that needs WhatsApp
// Business or an email service, neither of which this app has), so —
// same as BulkReminderModal — this is a fast checklist rather than a
// single "send all" button: each row is sent individually and checked
// off as you go.
//
// rows: [{ key, title, subtitle?, phone, email, vars }]
// channel: 'whatsapp' | 'email' | 'both' — which button(s) to show and
//   which link-type counts toward "sent". Defaults to 'both'.
export default function BulkSendModal({ open, onClose, category, rows, channel = 'both', onDone }) {
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState(null)
  const [sent, setSent] = useState(new Set())

  useEffect(() => {
    if (!open) return
    const list = getTemplates(category)
    setTemplates(list)
    setTemplateId(list[0]?.id || null)
    setSent(new Set())
  }, [open, category])

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
    const msg = renderTemplate(template?.whatsapp, row.vars || {})
    const link = waLink(row.phone, msg)
    if (!link) return
    window.open(link, '_blank', 'noopener')
    markSent(row.key)
  }

  function sendEmail(row) {
    const subject = renderTemplate(template?.subject, row.vars || {})
    const body = renderTemplate(template?.body, row.vars || {})
    const link = mailtoLink(row.email, subject, body)
    if (!link) return
    window.location.href = link
    markSent(row.key)
  }

  function handleDone() {
    if (sent.size > 0) {
      showToast(`Sent to ${sent.size} of ${rows.length}`)
    }
    onDone?.(sent)
    onClose()
  }

  const verb = channel === 'whatsapp' ? 'WhatsApp messages' : channel === 'email' ? 'emails' : 'messages'

  return (
    <Modal
      title={`Send ${verb} — ${rows.length} selected`}
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
          <p style={{ fontSize: 13, color: 'var(--ink-400)' }}>Nothing to send.</p>
        ) : rows.map((row) => {
          const isSent = sent.has(row.key)
          const hasPhone = !!row.phone
          const hasEmail = !!row.email
          return (
            <div
              key={row.key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 10px', border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-sm)',
                opacity: isSent ? 0.55 : 1,
              }}
            >
              <span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{row.title}</span>
                {row.subtitle && (
                  <>
                    <br />
                    <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{row.subtitle}</span>
                  </>
                )}
                {!hasPhone && !hasEmail && (
                  <>
                    <br />
                    <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>no contact on file</span>
                  </>
                )}
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {isSent && <span style={{ fontSize: 12, color: 'var(--teal-700)', marginRight: 4 }}>✓ Sent</span>}
                {channel !== 'whatsapp' && (
                  <button
                    type="button" className="btn btn-ghost btn-sm" disabled={!hasEmail}
                    title={hasEmail ? 'Send via Email' : 'No email on file'}
                    onClick={() => sendEmail(row)}
                  >✉️</button>
                )}
                {channel !== 'email' && (
                  <button
                    type="button" className="btn btn-ghost btn-sm" disabled={!hasPhone}
                    title={hasPhone ? 'Send via WhatsApp' : 'No phone number on file'}
                    onClick={() => sendWhatsApp(row)}
                  >💬</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
