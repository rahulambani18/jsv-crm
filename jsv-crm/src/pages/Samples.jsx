import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { COURIERS } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import MultiComboField from '../components/MultiComboField.jsx'
import SendButtons from '../components/SendButtons.jsx'
import Pagination from '../components/Pagination.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import BulkSendModal from '../components/BulkSendModal.jsx'
import { IconPlus, IconSearch, IconTrash } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'

const STATUSES = ['All statuses', 'Preparing', 'In Transit', 'Delivered']
const STATUS_TONE = { Preparing: 'gray', 'In Transit': 'amber', Delivered: 'teal' }

const SAMPLE_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'company', label: 'Company' },
  { key: 'contact', label: 'Contact' },
  { key: 'products', label: 'Products' },
  { key: 'qty', label: 'Qty' },
  { key: 'sent', label: 'Sent' },
  { key: 'courier', label: 'Courier' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'status', label: 'Status' },
]

function emptyForm() {
  return { company: '', contact: '', phone: '', email: '', products: [], qty: '', sent: '', courier: '', tracking: '', status: 'Preparing' }
}

export default function Samples() {
  const { can } = useAuth()
  const canEdit = can('samples', 'edit')
  const canDelete = can('samples', 'delete')
  const [samples, setSamples] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCols, setVisibleCols] = useState(SAMPLE_COLUMNS.map((c) => c.key))
  const [searchParams] = useSearchParams()
  const [search, setSearch] = usePersistedFilter('jsv_filter_samples_search', searchParams.get('q'), '')
  const [statusFilter, setStatusFilter] = usePersistedFilter('jsv_filter_samples_status', undefined, 'All statuses')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [users, setUsers] = useState([])
  const [sendModal, setSendModal] = useState(null) // 'whatsapp' | 'email' | null

  useEffect(() => { refresh() }, [])
  useEffect(() => { api.users.list().then(setUsers).catch(() => {}) }, [])
  useAutoRefresh(() => refresh(true), 60000)

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([api.samples.list(), api.products.list()]).then(([s, p]) => {
      setSamples(s); setProducts(p); setLoading(false)
    })
  }

  const productOptions = useMemo(() => products.map((p) => p.name), [products])

  const filtered = useMemo(() => samples.filter((s) => {
    const matchesSearch = !search || [s.company, s.tracking, ...(s.products || [])].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'All statuses' || s.status === statusFilter
    return matchesSearch && matchesStatus
  }), [samples, search, statusFilter])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search, statusFilter])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const record = { ...form, code: `SMP-${1040 + samples.length + 1}` }
    try {
      await api.samples.insert(record)
      setShowModal(false)
      setForm(emptyForm())
      refresh()
    } catch (err) {
      alert('Could not save sample: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(sampleId, newStatus) {
    setSamples((prev) => prev.map((s) => (s.id === sampleId ? { ...s, status: newStatus } : s)))
    try {
      await api.samples.update(sampleId, { status: newStatus })
    } catch (err) {
      alert('Could not update status: ' + (err.message || 'Unknown error'))
      refresh()
    }
  }

  async function handleDelete(sample) {
    if (!confirm(`Delete sample "${sample.code}" for ${sample.company}? This cannot be undone.`)) return
    try {
      await api.samples.remove(sample.id)
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
      prev.size === filtered.length ? new Set() : new Set(filtered.map((s) => s.id))
    )
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} sample${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.samples.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} sample${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected samples: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((s) => selected.has(s.id))
    exportCSV(
      'Samples',
      ['Code', 'Company', 'Contact', 'Products', 'Qty', 'Sent', 'Courier', 'Tracking', 'Status'],
      rows.map((s) => [s.code, s.company, s.contact, (s.products || []).join(', '), s.qty, s.sent, s.courier, s.tracking, s.status])
    )
  }

  async function handleBulkAssign(repName) {
    if (!repName) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.samples.update(id, { assignedTo: repName })))
      setSelected(new Set())
      refresh()
      showToast(`${count} sample${count === 1 ? '' : 's'} assigned to ${repName}`)
    } catch (err) {
      showToast('Could not assign: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  const sendRows = useMemo(() => filtered.filter((s) => selected.has(s.id)).map((s) => ({
    key: s.id,
    title: s.company,
    subtitle: `${s.code} · ${(s.products || []).join(', ')}`,
    phone: s.phone,
    email: s.email,
    vars: { company: s.company, contact: s.contact, products: (s.products || []).join(', '), courier: s.courier, tracking: s.tracking },
  })), [filtered, selected])

  return (
    <div>
      <PageHeader
        title="Samples"
        subtitle={samples.length === 0 ? 'No samples yet' : `${samples.length} sample${samples.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Samples"
              headers={['Code', 'Company', 'Contact', 'Products', 'Qty', 'Sent', 'Courier', 'Tracking', 'Status']}
              rows={filtered.map((s) => [s.code, s.company, s.contact, (s.products||[]).join(', '), s.qty, s.sent, s.courier, s.tracking, s.status])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <IconPlus width={15} height={15} /> New Sample
              </button>
            )}
          </div>
        }
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search company, products, tracking…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <ColumnChooser columns={SAMPLE_COLUMNS} storageKey="jsv_cols_samples" onChange={setVisibleCols} />
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
          <button type="button" className="btn btn-ghost-light" onClick={() => setSendModal('email')}>✉️ Send Email</button>
          <button type="button" className="btn btn-ghost-light" onClick={() => setSendModal('whatsapp')}>💬 Send WhatsApp</button>
        </BulkActionsBar>
      )}

      <BulkSendModal
        open={!!sendModal}
        onClose={() => setSendModal(null)}
        category="sample"
        channel={sendModal || 'both'}
        rows={sendRows}
      />

      <div className="table-wrap sticky-first-col">
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
              {visibleCols.map((key) => (
                <th key={key}>{SAMPLE_COLUMNS.find((c) => c.key === key)?.label}</th>
              ))}
              {(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={visibleCols.length + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)} rows={6} />
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)}>
                {samples.length === 0 ? (
                  <EmptyState
                    icon="🧫"
                    title="No samples yet"
                    subtitle="Send your first sample to a prospect and track it here."
                    actionLabel={canEdit ? 'New Sample' : undefined}
                    onAction={canEdit ? () => setShowModal(true) : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No samples match your filters" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : paged.map((s) => {
              const cell = (key) => {
                switch (key) {
                  case 'code': return <td key={key} className="cell-mono">{s.code}</td>
                  case 'company': return <td key={key} className="cell-strong">{s.company}</td>
                  case 'contact': return <td key={key}>{s.contact}<br /><span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{s.phone}</span></td>
                  case 'products': return <td key={key}>{(s.products || []).join(', ')}</td>
                  case 'qty': return <td key={key} className="cell-mono">{s.qty}</td>
                  case 'sent': return <td key={key} className="cell-mono">{s.sent}</td>
                  case 'courier': return <td key={key}>{s.courier}</td>
                  case 'tracking': return <td key={key} className="cell-mono" style={{ fontSize: 11.5 }}>{s.tracking}</td>
                  case 'status': return (
                    <td key={key}>
                      {canEdit ? (
                        <select
                          value={s.status}
                          onChange={(e) => handleStatusChange(s.id, e.target.value)}
                          className={`pill pill-${STATUS_TONE[s.status] || 'gray'}`}
                          style={{ border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', paddingRight: 22 }}
                          title="Change status"
                        >
                          <option>Preparing</option>
                          <option>In Transit</option>
                          <option>Delivered</option>
                        </select>
                      ) : (
                        <Pill>{s.status}</Pill>
                      )}
                    </td>
                  )
                  default: return null
                }
              }
              return (
              <tr key={s.id}>
                {canEdit && (
                  <td className="header-checkbox-cell">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelected(s.id)} />
                  </td>
                )}
                {visibleCols.map((key) => cell(key))}
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <SendButtons
                        phone={s.phone}
                        email={s.email}
                        category="sample"
                        vars={{ company: s.company, contact: s.contact, products: (s.products || []).join(', '), courier: s.courier, tracking: s.tracking }}
                      />
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(s)} title="Delete"><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />

      {showModal && (
        <Modal
          title="New Sample"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="sample-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save sample'}
              </button>
            </>
          }
        >
          <form id="sample-form" onSubmit={handleCreate}>
            <div className="field-row">
              <div className="field">
                <label>Company</label>
                <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="field">
                <label>Contact person</label>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Phone number</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 90000 00000" />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Products</label>
              <MultiComboField options={productOptions} value={form.products} onChange={(v) => setForm({ ...form, products: v })} placeholder="Select a product…" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Quantity</label>
                <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="e.g. 500 g" />
              </div>
              <div className="field">
                <label>Sent date</label>
                <input type="date" value={form.sent} onChange={(e) => setForm({ ...form, sent: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Courier name</label>
                <select value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })}>
                  <option value="" disabled>Select courier…</option>
                  {COURIERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Tracking number</label>
                <input value={form.tracking} onChange={(e) => setForm({ ...form, tracking: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Preparing</option><option>In Transit</option><option>Delivered</option>
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
