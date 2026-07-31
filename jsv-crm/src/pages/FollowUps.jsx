import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import SendButtons from '../components/SendButtons.jsx'
import { IconPlus } from '../components/Icons.jsx'
import EmptyState from '../components/EmptyState.jsx'
import '../styles/components.css'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import ClearFiltersButton from '../components/ClearFiltersButton.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'
import { showToast } from '../lib/toast.js'

const TABS = ['Today', 'Upcoming', 'Overdue', 'Completed', 'All']

const FOLLOWUP_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'lead', label: 'Lead' },
  { key: 'contact', label: 'Contact' },
  { key: 'notes', label: 'Notes' },
  { key: 'status', label: 'Status' },
]

function emptyForm() {
  return { date: '', type: 'Call', lead: '', contact: '', notes: '', status: 'Upcoming' }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysISO(dateStr, days) {
  const d = dateStr ? new Date(dateStr) : new Date()
  return new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10)
}

export default function FollowUps() {
  const [items, setItems] = useState([])
  const [leads, setLeads] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab, tabMeta] = usePersistedFilter('jsv_filter_followups_tab', undefined, 'Today')
  const [visibleCols, setVisibleCols] = useState(FOLLOWUP_COLUMNS.map((c) => c.key))
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(null) // the follow-up being marked complete
  const [scheduleNext, setScheduleNext] = useState(true)
  const [nextForm, setNextForm] = useState({ date: '', type: 'Call', notes: '' })
  const [completingSaving, setCompletingSaving] = useState(false)

  useEffect(() => { refresh() }, [])
  useEffect(() => { Promise.all([api.leads.list(), api.customers.list()]).then(([l, c]) => { setLeads(l); setCustomers(c) }).catch(() => {}) }, [])
  useAutoRefresh(() => refresh(true), 60000)

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    api.followUps.list().then((data) => { setItems(data); setLoading(false) })
  }

  // A follow-up's "lead" field holds the company name — look it up in
  // leads first (most follow-ups are pre-conversion), then customers.
  function contactInfoFor(f) {
    const l = leads.find((x) => x.company === f.lead)
    const c = customers.find((x) => x.company === f.lead)
    return { phone: l?.phone || c?.mobile, email: l?.email || c?.email }
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

  function openComplete(f) {
    setCompleting(f)
    setScheduleNext(true)
    setNextForm({ date: addDaysISO(todayISO(), 7), type: f.type, notes: '' })
  }

  async function handleMarkComplete(e) {
    e.preventDefault()
    setCompletingSaving(true)
    try {
      await api.followUps.update(completing.id, { status: 'Completed' })
      if (scheduleNext) {
        await api.followUps.insert({
          date: nextForm.date,
          type: nextForm.type,
          lead: completing.lead,
          contact: completing.contact,
          notes: nextForm.notes,
          status: nextForm.date === todayISO() ? 'Today' : 'Upcoming',
        })
        showToast(`Follow-up completed — next one scheduled for ${nextForm.date}`)
      } else {
        showToast('Follow-up marked complete')
      }
      setCompleting(null)
      refresh()
    } catch (err) {
      showToast('Could not update: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setCompletingSaving(false)
    }
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

      <div className="filters-bar" style={{ justifyContent: 'flex-end' }}>
        <ClearFiltersButton filters={[tabMeta]} onClear={() => tabMeta.clear()} />
        <ColumnChooser columns={FOLLOWUP_COLUMNS} storageKey="jsv_cols_followups" onChange={setVisibleCols} />
      </div>

      <div className="table-wrap sticky-first-col">
        <table className="data-table">
          <thead>
            <tr>
              {visibleCols.map((key) => (
                <th key={key}>{FOLLOWUP_COLUMNS.find((c) => c.key === key)?.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={visibleCols.length + 1} rows={6} />
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + 1}>
                <EmptyState
                  icon="⏰"
                  title="No follow-ups in this view"
                  subtitle="Switch tabs to see other follow-ups, or schedule a new one."
                  actionLabel="Schedule Follow-up"
                  onAction={() => setShowModal(true)}
                />
              </td></tr>
            ) : filtered.map((f) => {
              const { phone, email } = contactInfoFor(f)
              const cell = (key) => {
                switch (key) {
                  case 'date': return <td key={key} className="cell-mono">{f.date}</td>
                  case 'type': return <td key={key}>{f.type}</td>
                  case 'lead': return <td key={key} className="cell-strong">{f.lead}</td>
                  case 'contact': return <td key={key}>{f.contact}</td>
                  case 'notes': return <td key={key} style={{ maxWidth: 320 }}>{f.notes}</td>
                  case 'status': return <td key={key}><Pill>{f.status}</Pill></td>
                  default: return null
                }
              }
              return (
              <tr key={f.id}>
                {visibleCols.map((key) => cell(key))}
                <td style={{ display: 'flex', gap: 4 }}>
                  {f.status !== 'Completed' && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Mark complete and optionally schedule the next follow-up"
                      onClick={() => openComplete(f)}
                    >
                      ✓ Complete
                    </button>
                  )}
                  <SendButtons
                    phone={phone}
                    email={email}
                    category="followUp"
                    vars={{ contact: f.contact, lead: f.lead, notes: f.notes }}
                  />
                </td>
              </tr>
            )})}
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

      {completing && (
        <Modal
          title="Mark Follow-up Complete"
          onClose={() => setCompleting(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCompleting(null)}>Cancel</button>
              <button className="btn btn-primary" form="complete-followup-form" type="submit" disabled={completingSaving}>
                {completingSaving ? 'Saving…' : 'Done'}
              </button>
            </>
          }
        >
          <form id="complete-followup-form" onSubmit={handleMarkComplete}>
            <p className="sub" style={{ marginTop: -4, marginBottom: 14 }}>
              {completing.lead} · {completing.type} on {completing.date}
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={scheduleNext} onChange={(e) => setScheduleNext(e.target.checked)} />
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>Schedule the next follow-up</span>
            </label>
            {scheduleNext && (
              <>
                <div className="field-row">
                  <div className="field">
                    <label>Next Date</label>
                    <input type="date" required value={nextForm.date} onChange={(e) => setNextForm({ ...nextForm, date: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <select value={nextForm.type} onChange={(e) => setNextForm({ ...nextForm, type: e.target.value })}>
                      <option>Call</option><option>Email</option><option>Meeting</option><option>Sample Dispatch</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Notes</label>
                  <textarea rows={2} placeholder="What's this follow-up about?" value={nextForm.notes} onChange={(e) => setNextForm({ ...nextForm, notes: e.target.value })} />
                </div>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
