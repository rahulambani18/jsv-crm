import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { COURIERS } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import MultiComboField from '../components/MultiComboField.jsx'
import { IconPlus, IconSearch } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import '../styles/components.css'

const STATUSES = ['All statuses', 'Preparing', 'In Transit', 'Delivered']

function emptyForm() {
  return { company: '', contact: '', phone: '', email: '', products: [], qty: '', sent: '', courier: '', tracking: '', status: 'Preparing' }
}

export default function Samples() {
  const { can } = useAuth()
  const canEdit = can('samples', 'edit')
  const [samples, setSamples] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const record = { ...form, code: `SMP-${1040 + samples.length + 1}` }
    await api.samples.insert(record)
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm())
    refresh()
  }

  return (
    <div>
      <PageHeader
        title="Samples"
        subtitle={`${samples.length} sample${samples.length === 1 ? '' : 's'}`}
        actions={
          canEdit && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <IconPlus width={15} height={15} /> New Sample
            </button>
          )
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
            <tr><th>Code</th><th>Company</th><th>Contact</th><th>Products</th><th>Qty</th><th>Sent</th><th>Courier</th><th>Tracking</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={9}>Loading samples…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={9}>{samples.length === 0 ? 'No samples yet.' : 'No samples match your filters.'}</td></tr>
            ) : filtered.map((s) => (
              <tr key={s.id}>
                <td className="cell-mono">{s.code}</td>
                <td className="cell-strong">{s.company}</td>
                <td>{s.contact}<br /><span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{s.phone}</span></td>
                <td>{(s.products || []).join(', ')}</td>
                <td className="cell-mono">{s.qty}</td>
                <td className="cell-mono">{s.sent}</td>
                <td>{s.courier}</td>
                <td className="cell-mono" style={{ fontSize: 11.5 }}>{s.tracking}</td>
                <td><Pill>{s.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
