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
import { IconPlus, IconSearch, IconTrash } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { templates } from '../lib/messaging.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'

const STATUSES = ['All statuses', 'Preparing', 'In Transit', 'Delivered']
const STATUS_TONE = { Preparing: 'gray', 'In Transit': 'amber', Delivered: 'teal' }

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
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
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

  return (
    <div>
      <PageHeader
        title="Samples"
        subtitle={`${samples.length} sample${samples.length === 1 ? '' : 's'}`}
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
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Company</th><th>Contact</th><th>Products</th><th>Qty</th><th>Sent</th><th>Courier</th><th>Tracking</th><th>Status</th>{(canEdit || canDelete) && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={(canEdit || canDelete) ? 10 : 9}>Loading samples…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={(canEdit || canDelete) ? 10 : 9}>
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
              const t = templates.sample(s)
              return (
              <tr key={s.id}>
                <td className="cell-mono">{s.code}</td>
                <td className="cell-strong">{s.company}</td>
                <td>{s.contact}<br /><span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{s.phone}</span></td>
                <td>{(s.products || []).join(', ')}</td>
                <td className="cell-mono">{s.qty}</td>
                <td className="cell-mono">{s.sent}</td>
                <td>{s.courier}</td>
                <td className="cell-mono" style={{ fontSize: 11.5 }}>{s.tracking}</td>
                <td>
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
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <SendButtons phone={s.phone} email={s.email} whatsappMessage={t.whatsapp} mailSubject={t.subject} mailBody={t.body} />
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
