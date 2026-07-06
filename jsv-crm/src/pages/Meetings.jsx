import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconSearch, IconEdit, IconTrash } from '../components/Icons.jsx'
import '../styles/components.css'

const MEETING_TYPES = ['Site Visit', 'Office Meeting', 'Video Call', 'Call', 'Exhibition', 'Other']
const STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled']
const TABS = ['All', 'Scheduled', 'Completed']

function emptyForm() {
  return { title: '', company: '', contact: '', date: '', time: '', location: '', type: 'Office Meeting', agenda: '', status: 'Scheduled', notes: '' }
}

export default function Meetings() {
  const { can } = useAuth()
  const canEdit = can('meetings', 'edit')
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    api.meetings.list().then((d) => { setMeetings(d); setLoading(false) })
  }

  const counts = useMemo(() => {
    const c = { All: meetings.length, Scheduled: 0, Completed: 0 }
    meetings.forEach((m) => { if (c[m.status] !== undefined) c[m.status]++ })
    return c
  }, [meetings])

  const filtered = useMemo(() => meetings.filter((m) => {
    const matchTab = tab === 'All' || m.status === tab
    const matchSearch = !search || [m.title, m.company, m.contact].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    return matchTab && matchSearch
  }).sort((a, b) => (a.date || '').localeCompare(b.date || '')), [meetings, tab, search])

  function openCreate() { setEditingId(null); setForm(emptyForm()); setShowModal(true) }
  function openEdit(m) {
    setEditingId(m.id)
    setForm({ title: m.title || '', company: m.company || '', contact: m.contact || '', date: m.date || '', time: m.time || '', location: m.location || '', type: m.type || 'Office Meeting', agenda: m.agenda || '', status: m.status || 'Scheduled', notes: m.notes || '' })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    if (editingId) await api.meetings.update(editingId, form)
    else await api.meetings.insert(form)
    setSaving(false); setShowModal(false); setForm(emptyForm()); setEditingId(null); refresh()
  }

  async function handleDelete(m) {
    if (!window.confirm(`Delete meeting "${m.title}"?`)) return
    await api.meetings.remove(m.id); refresh()
  }

  const typeIcon = { 'Site Visit': '🏭', 'Office Meeting': '🏢', 'Video Call': '💻', 'Call': '📞', 'Exhibition': '🎪', 'Other': '📅' }

  return (
    <div>
      <PageHeader
        title="Meetings"
        subtitle={`${counts.Scheduled} scheduled`}
        actions={canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <IconPlus width={15} height={15} /> Schedule Meeting
          </button>
        )}
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search meetings, company, contact…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="tabs-bar" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t} <span className="count">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--ink-300)', padding: '40px 0' }}>Loading meetings…</div>
        ) : filtered.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--ink-300)', padding: '40px 0' }}>No meetings in this view.</div>
        ) : filtered.map((m) => (
          <div key={m.id} className="panel" style={{ display: 'flex', gap: 16, padding: '16px 20px', opacity: m.status === 'Cancelled' ? 0.6 : 1 }}>
            {/* Date block */}
            <div style={{ flexShrink: 0, width: 52, textAlign: 'center', background: 'var(--paper-50)', borderRadius: 8, padding: '8px 4px', border: '1px solid var(--paper-200)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {m.date ? new Date(m.date).toLocaleString('en-IN', { month: 'short' }) : '—'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--navy-900)', lineHeight: 1.1 }}>
                {m.date ? m.date.slice(8) : '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-400)' }}>{m.time || ''}</div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 15 }}>{typeIcon[m.type] || '📅'}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-900)' }}>{m.title}</span>
                <Pill>{m.status}</Pill>
                <span style={{ fontSize: 12, background: 'var(--paper-100)', color: 'var(--ink-500)', padding: '2px 8px', borderRadius: 100 }}>{m.type}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--ink-500)', marginBottom: m.agenda ? 8 : 0 }}>
                {m.company && <span>🏢 {m.company}</span>}
                {m.contact && <span>👤 {m.contact}</span>}
                {m.location && <span>📍 {m.location}</span>}
              </div>
              {m.agenda && <p style={{ fontSize: 13, color: 'var(--ink-600)', margin: '0 0 4px', fontStyle: 'italic' }}>{m.agenda}</p>}
              {m.notes && <p style={{ fontSize: 12.5, color: 'var(--teal-700)', margin: 0, background: 'var(--teal-100)', padding: '6px 10px', borderRadius: 6 }}>📝 {m.notes}</p>}
            </div>

            {canEdit && (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}><IconEdit width={13} height={13} /></button>
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(m)}><IconTrash width={13} height={13} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Edit Meeting' : 'Schedule Meeting'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="meeting-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Schedule'}
              </button>
            </>
          }
        >
          <form id="meeting-form" onSubmit={handleSave}>
            <div className="field">
              <label>Meeting title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Site visit — Devansh Foods" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Company</label>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="field">
                <label>Contact</label>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="field">
                <label>Time</label>
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {MEETING_TYPES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Location / Platform</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Mumbai Office, Google Meet, Phone" />
            </div>
            <div className="field">
              <label>Agenda</label>
              <textarea rows={2} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} placeholder="What will be discussed?" />
            </div>
            <div className="field">
              <label>Notes / Outcome</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Post-meeting notes…" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
