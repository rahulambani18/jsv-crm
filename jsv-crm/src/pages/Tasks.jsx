import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconSearch, IconEdit, IconTrash } from '../components/Icons.jsx'
import '../styles/components.css'

const TASK_TYPES = ['Call', 'Email', 'Document', 'Internal', 'Follow-up', 'Other']
const PRIORITIES = ['High', 'Medium', 'Low']
const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled']
const TABS = ['All', 'Pending', 'In Progress', 'Completed']

function emptyForm() {
  return { title: '', description: '', assignedTo: '', relatedTo: '', type: 'Call', priority: 'Medium', dueDate: '', status: 'Pending' }
}

export default function Tasks() {
  const { user, can } = useAuth()
  const canEdit = can('tasks', 'edit')
  const canDelete = can('tasks', 'delete')
  const [tasks, setTasks] = useState([])
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
    api.tasks.list().then((d) => { setTasks(d); setLoading(false) })
  }

  const counts = useMemo(() => {
    const c = { All: tasks.length, Pending: 0, 'In Progress': 0, Completed: 0 }
    tasks.forEach((t) => { if (c[t.status] !== undefined) c[t.status]++ })
    return c
  }, [tasks])

  const filtered = useMemo(() => tasks.filter((t) => {
    const matchTab = tab === 'All' || t.status === tab
    const matchSearch = !search || [t.title, t.assignedTo, t.relatedTo].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    return matchTab && matchSearch
  }), [tasks, tab, search])

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm(), assignedTo: user?.name || '' })
    setShowModal(true)
  }

  function openEdit(task) {
    setEditingId(task.id)
    setForm({ title: task.title || '', description: task.description || '', assignedTo: task.assignedTo || '', relatedTo: task.relatedTo || '', type: task.type || 'Call', priority: task.priority || 'Medium', dueDate: task.dueDate || '', status: task.status || 'Pending' })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) await api.tasks.update(editingId, form)
      else await api.tasks.insert(form)
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      refresh()
    } catch (err) {
      alert('Could not save task: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleDone(task) {
    try {
      await api.tasks.update(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })
      refresh()
    } catch (err) {
      alert('Could not update task: ' + (err.message || 'Unknown error'))
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    try {
      await api.tasks.remove(task.id)
      refresh()
    } catch (err) {
      alert('Could not delete: ' + (err.message || 'Unknown error'))
    }
  }

  const priorityColor = { High: 'var(--red-600)', Medium: 'var(--amber-600)', Low: 'var(--ink-400)' }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${tasks.filter((t) => t.status !== 'Completed').length} open task${tasks.filter((t) => t.status !== 'Completed').length === 1 ? '' : 's'}`}
        actions={canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <IconPlus width={15} height={15} /> New Task
          </button>
        )}
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search tasks, assignee, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="tabs-bar" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t} <span className="count">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--ink-300)', padding: '40px 0' }}>Loading tasks…</div>
        ) : filtered.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--ink-300)', padding: '40px 0' }}>No tasks in this view.</div>
        ) : filtered.map((t) => (
          <div key={t.id} className="panel" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px' }}>
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={t.status === 'Completed'}
              onChange={() => canEdit && toggleDone(t)}
              style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: 'var(--teal-600)', cursor: canEdit ? 'pointer' : 'default' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: t.status === 'Completed' ? 'var(--ink-300)' : 'var(--ink-900)', textDecoration: t.status === 'Completed' ? 'line-through' : 'none' }}>
                  {t.title}
                </span>
                <Pill>{t.priority}</Pill>
                <Pill>{t.status}</Pill>
                <span style={{ fontSize: 12, background: 'var(--paper-100)', color: 'var(--ink-500)', padding: '2px 8px', borderRadius: 100 }}>{t.type}</span>
              </div>
              {t.description && <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '0 0 6px' }}>{t.description}</p>}
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-400)', flexWrap: 'wrap' }}>
                {t.assignedTo && <span>👤 {t.assignedTo}</span>}
                {t.relatedTo && <span>🏢 {t.relatedTo}</span>}
                {t.dueDate && <span style={{ color: t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== 'Completed' ? 'var(--red-600)' : 'var(--ink-400)' }}>📅 Due {t.dueDate}</span>}
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><IconEdit width={13} height={13} /></button>}
                {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(t)}><IconTrash width={13} height={13} /></button>}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Edit Task' : 'New Task'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="task-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create task'}
              </button>
            </>
          }
        >
          <form id="task-form" onSubmit={handleSave}>
            <div className="field">
              <label>Task title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="More details…" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TASK_TYPES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Assigned to</label>
                <input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
              </div>
              <div className="field">
                <label>Related to (company/lead)</label>
                <input value={form.relatedTo} onChange={(e) => setForm({ ...form, relatedTo: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Due date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
