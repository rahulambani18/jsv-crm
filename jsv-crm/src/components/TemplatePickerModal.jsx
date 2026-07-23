import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { CATEGORIES, getTemplates, saveTemplate, deleteTemplate, resetCategory, renderTemplate } from '../lib/templateLibrary.js'
import { waLink, mailtoLink } from '../lib/messaging.js'
import { showToast } from '../lib/toast.js'

// Opened from SendButtons. Lets a rep pick from several saved templates
// for this record type (Standard / Gentle nudge / Firm reminder, ...),
// see the message with real values filled in, tweak it further, and
// send — or switch to "Manage templates" to add/edit/delete the
// templates themselves. Everything is stored locally per browser via
// templateLibrary.js.
export default function TemplatePickerModal({ open, onClose, category, vars, phone, email }) {
  const meta = CATEGORIES.find((c) => c.key === category)
  const [templates, setTemplates] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [managing, setManaging] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ name: '', subject: '', body: '', whatsapp: '' })

  function reload(selectId) {
    const list = getTemplates(category)
    setTemplates(list)
    const t = list.find((x) => x.id === selectId) || list[0]
    if (t) applyTemplate(t)
  }

  useEffect(() => {
    if (!open) return
    setManaging(false)
    setEditingId(null)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category])

  function applyTemplate(t) {
    setSelectedId(t.id)
    setSubject(renderTemplate(t.subject, vars))
    setBody(renderTemplate(t.body, vars))
    setWhatsapp(renderTemplate(t.whatsapp, vars))
  }

  function handleSelect(id) {
    const t = templates.find((x) => x.id === id)
    if (t) applyTemplate(t)
  }

  const wa = waLink(phone, whatsapp)
  const mail = mailtoLink(email, subject, body)

  function sendWhatsApp() {
    if (!wa) return
    window.open(wa, '_blank', 'noopener')
    onClose()
  }
  function sendEmail() {
    if (!mail) return
    window.location.href = mail
    onClose()
  }

  function startNewTemplate() {
    setEditingId('__new__')
    setDraft({ name: '', subject: '', body: '', whatsapp: '' })
  }
  function startEditTemplate(t) {
    setEditingId(t.id)
    setDraft({ name: t.name, subject: t.subject, body: t.body, whatsapp: t.whatsapp })
  }
  function saveDraft() {
    if (!draft.name.trim()) { showToast('Give this template a name first.', 'error'); return }
    const id = editingId === '__new__' ? undefined : editingId
    const saved = saveTemplate(category, { id, ...draft })
    setEditingId(null)
    reload(saved.id)
    showToast('Template saved.')
  }
  function removeTemplate(t) {
    if (templates.length <= 1) { showToast("Can't delete the last template in this category.", 'error'); return }
    if (!confirm(`Delete template "${t.name}"?`)) return
    deleteTemplate(category, t.id)
    reload()
    showToast('Template deleted.')
  }
  function handleReset() {
    if (!confirm('Reset to the default templates for this category? Your custom ones will be removed.')) return
    resetCategory(category)
    reload()
    showToast('Reset to defaults.')
  }

  if (!open) return null

  return (
    <Modal
      title={managing ? `Manage templates — ${meta?.label || ''}` : `Send — ${meta?.label || ''}`}
      onClose={onClose}
      footer={
        managing ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={handleReset}>Reset to defaults</button>
            <button type="button" className="btn btn-primary" onClick={() => setManaging(false)}>Done</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setManaging(true)}>⚙ Manage templates</button>
            <button type="button" className="btn btn-secondary" disabled={!mail} title={mail ? '' : 'No email on file'} onClick={sendEmail}>✉️ Send Email</button>
            <button type="button" className="btn btn-primary" disabled={!wa} title={wa ? '' : 'No phone number on file'} onClick={sendWhatsApp}>💬 Send WhatsApp</button>
          </>
        )
      }
    >
      {!managing ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label>Template</label>
            <select value={selectedId || ''} onChange={(e) => handleSelect(e.target.value)}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>WhatsApp message{!phone && ' (no phone number on file)'}</label>
            <textarea rows={4} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={!phone} />
          </div>
          <div className="field">
            <label>Email subject{!email && ' (no email on file)'}</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!email} />
          </div>
          <div className="field">
            <label>Email body</label>
            <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} disabled={!email} />
          </div>
        </form>
      ) : editingId ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label>Template name</label>
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Firm reminder" />
          </div>
          <div className="field">
            <label>WhatsApp message</label>
            <textarea rows={4} value={draft.whatsapp} onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))} />
          </div>
          <div className="field">
            <label>Email subject</label>
            <input value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
          </div>
          <div className="field">
            <label>Email body</label>
            <textarea rows={5} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
          </div>
          {meta?.vars?.length > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginBottom: 12 }}>
              Available placeholders: {meta.vars.map((v) => `{{${v}}}`).join('  ')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={saveDraft}>Save template</button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {templates.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEditTemplate(t)}>Edit</button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeTemplate(t)}>Delete</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={startNewTemplate}>+ New template</button>
        </div>
      )}
    </Modal>
  )
}
