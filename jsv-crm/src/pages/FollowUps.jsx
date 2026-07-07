import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus } from '../components/Icons.jsx'
import '../styles/components.css'

const TABS = ['Today', 'Upcoming', 'Overdue', 'Completed', 'All']

function emptyForm() {
  return { date: '', type: 'Call', lead: '', contact: '', notes: '', status: 'Upcoming' }
}

export default function FollowUps() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Today')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    api.followUps.list().then((data) => { setItems(data); setLoading(false) })
  }

  const counts = useMemo(() => {
    const c = { Today: 0, Upcoming: 0, Overdue: 0, Completed: 0, All: items.length }
    items.forEach((i) => { if (c[i.status] !== undefined) c[i.status] += 1 })
    return c
  }, [items])

  const filtered = useMemo(() => tab === 'All' ? items : items.filter((i) => i.status === tab), [items, tab])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    await api.followUps.insert(form)
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm())
    refresh()
  }

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        subtitle="Track calls, emails, meetings and sample dispatches."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Follow-ups"
              headers={['Date', 'Type', 'Lead', 'Contact', 'Notes', 'Status']}
              rows={filtered.map((f) => [f.date, f.type, f.lead, f.contact, f.notes, f.status])}
              count={filtered.length}
            />
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <IconPlus width={15} height={15} /> Schedule Follow-up
            </button>
          </div>
        }
      />

      <div className="tabs-bar">
        {TABS.map((t) => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t} <span className="count">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Lead</th><th>Contact</th><th>Notes</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={6}>Loading follow-ups…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={6}>No follow-ups in this view.</td></tr>
            ) : filtered.map((f) => (
              <tr key={f.id}>
                <td className="cell-mono">{f.date}</td>
                <td>{f.type}</td>
                <td className="cell-strong">{f.lead}</td>
                <td>{f.contact}</td>
                <td style={{ maxWidth: 320 }}>{f.notes}</td>
                <td><Pill>{f.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title="Schedule Follow-up"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="followup-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Schedule'}
              </button>
            </>
          }
        >
          <form id="followup-form" onSubmit={handleCreate}>
            <div className="field-row">
              <div className="field">
                <label>Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Call</option><option>Email</option><option>Meeting</option><option>Sample Dispatch</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Lead / Company</label>
                <input required value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} />
              </div>
              <div className="field">
                <label>Contact</label>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Today</option><option>Upcoming</option><option>Overdue</option><option>Completed</option>
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
