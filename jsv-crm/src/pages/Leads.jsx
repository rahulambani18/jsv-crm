import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { PIPELINE_STAGES, INDUSTRY_OPTIONS } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ComboField from '../components/ComboField.jsx'
import MultiComboField from '../components/MultiComboField.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import SendButtons from '../components/SendButtons.jsx'
import Pagination from '../components/Pagination.jsx'
import { IconPlus, IconSearch, IconTrash } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'

const STATUSES = ['All statuses', ...PIPELINE_STAGES]

function emptyForm() {
  return { company: '', contact: '', phone: '', city: '', priority: 'Medium', status: 'New Lead', estValue: '', nextFollowUp: '', industry: '', products: [] }
}

export default function Leads() {
  const { can } = useAuth()
  const canEdit = can('leads', 'edit')
  const canDelete = can('leads', 'delete')
  const [leads, setLeads] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [users, setUsers] = useState([])

  useEffect(() => { refresh() }, [])
  useEffect(() => { api.users.list().then(setUsers).catch(() => {}) }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.leads.list(), api.products.list()]).then(([l, p]) => {
      setLeads(l); setProducts(p); setLoading(false)
    })
  }

  const productOptions = useMemo(() => products.map((p) => p.name), [products])

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch = !search || [l.company, l.contact, l.phone, l.city].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
      const matchesStatus = statusFilter === 'All statuses' || l.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [leads, search, statusFilter])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search, statusFilter])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const record = { ...form, estValue: Number(form.estValue) || 0 }
    try {
      await api.leads.insert(record)
      setShowModal(false)
      setForm(emptyForm())
      refresh()
    } catch (err) {
      alert('Could not save lead: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(lead) {
    if (!confirm(`Delete lead "${lead.company}"? This cannot be undone.`)) return
    try {
      await api.leads.remove(lead.id)
      refresh()
    } catch (err) {
      alert('Could not delete: ' + (err.message || 'Unknown error'))
    }
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id))
    )
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} lead${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.leads.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} lead${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected leads: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((l) => selected.has(l.id))
    exportCSV(
      'Leads',
      ['Company', 'Contact', 'Phone', 'City', 'Priority', 'Status', 'Est. Value', 'Next Follow-up', 'Industry'],
      rows.map((l) => [l.company, l.contact, l.phone, l.city, l.priority, l.status, l.estValue, l.nextFollowUp, l.industry])
    )
  }

  async function handleBulkAssign(repName) {
    if (!repName) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.leads.update(id, { assignedTo: repName })))
      setSelected(new Set())
      refresh()
      showToast(`${count} lead${count === 1 ? '' : 's'} assigned to ${repName}`)
    } catch (err) {
      showToast('Could not assign: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleBulkStatus(status) {
    if (!status) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.leads.update(id, { status })))
      setSelected(new Set())
      refresh()
      showToast(`Pipeline stage updated to "${status}" for ${count} lead${count === 1 ? '' : 's'}`)
    } catch (err) {
      showToast('Could not update status: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleBulkPriority(priority) {
    if (!priority) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.leads.update(id, { priority })))
      setSelected(new Set())
      refresh()
      showToast(`Priority set to "${priority}" for ${count} lead${count === 1 ? '' : 's'}`)
    } catch (err) {
      showToast('Could not update priority: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} lead${leads.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Leads"
              headers={['Company', 'Contact', 'Phone', 'City', 'Priority', 'Status', 'Est. Value', 'Next Follow-up', 'Industry']}
              rows={filtered.map((l) => [l.company, l.contact, l.phone, l.city, l.priority, l.status, l.estValue, l.nextFollowUp, l.industry])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <IconPlus width={15} height={15} /> New Lead
              </button>
            )}
          </div>
        }
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search company, contact, phone, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {canEdit && (
        <BulkActionsBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onExport={handleBulkExport}
          onDelete={canDelete ? handleBulkDelete : undefined}
        >
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkAssign(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Assign to…</option>
            {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkStatus(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Change stage…</option>
            {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkPriority(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Set priority…</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </BulkActionsBar>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {canEdit && (
                <th className="header-checkbox-cell">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th>Lead</th><th>Company</th><th>Contact</th><th>City</th>
              <th>Priority</th><th>Status</th><th>Est. Value</th><th>Next Follow-up</th>{(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={8 + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)}>Loading leads…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={8 + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)}>
                {leads.length === 0 ? (
                  <EmptyState
                    icon="🎯"
                    title="No leads yet"
                    subtitle="Add your first lead to start building your pipeline."
                    actionLabel={canEdit ? 'New Lead' : undefined}
                    onAction={canEdit ? () => setShowModal(true) : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No leads match your filters" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : paged.map((l) => (
              <tr key={l.id}>
                {canEdit && (
                  <td className="row-checkbox-cell">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelected(l.id)} />
                  </td>
                )}
                <td className="cell-mono cell-muted">{l.id.toUpperCase()}</td>
                <td className="cell-strong">{l.company}</td>
                <td>{l.contact}<br /><span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{l.phone}</span></td>
                <td>{l.city}</td>
                <td><Pill>{l.priority}</Pill></td>
                <td><Pill>{l.status}</Pill></td>
                <td className="cell-mono">₹{Number(l.estValue).toLocaleString('en-IN')}</td>
                <td className="cell-mono">{l.nextFollowUp}</td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <SendButtons
                        phone={l.phone}
                        email={l.email}
                        whatsappMessage={`Hi ${l.contact || ''}, this is JSV Ingredient reaching out regarding ${(l.products || []).join(', ') || 'your enquiry'}. Let us know how we can help!`}
                        mailSubject={`Following up — ${l.company}`}
                        mailBody={`Dear ${l.contact || l.company},\n\nFollowing up on your enquiry with JSV Ingredient.\n\nRegards,\nJSV Ingredient`}
                      />
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(l)}><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />

      {showModal && (
        <Modal
          title="New Lead"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="lead-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save lead'}
              </button>
            </>
          }
        >
          <form id="lead-form" onSubmit={handleCreate}>
            <div className="field">
              <label>Company name</label>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Patel Agro Industries" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Contact person</label>
                <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 90000 00000" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="field">
                <label>Industry</label>
                <ComboField
                  options={INDUSTRY_OPTIONS}
                  value={form.industry}
                  onChange={(v) => setForm({ ...form, industry: v })}
                  placeholder="Select industry…"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div className="field">
                <label>Pipeline stage</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Est. value (₹)</label>
                <input type="number" min="0" value={form.estValue} onChange={(e) => setForm({ ...form, estValue: e.target.value })} />
              </div>
              <div className="field">
                <label>Next follow-up</label>
                <input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Products of interest</label>
              <MultiComboField
                options={productOptions}
                value={form.products}
                onChange={(v) => setForm({ ...form, products: v })}
                placeholder="Select a product…"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
