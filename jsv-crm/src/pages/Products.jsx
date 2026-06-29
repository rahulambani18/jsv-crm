import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconSearch } from '../components/Icons.jsx'
import '../styles/components.css'

function emptyForm() {
  return { name: '', category: '', supplier: '', origin: '', moq: '', docs: '', status: 'Active' }
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    api.products.list().then((data) => { setProducts(data); setLoading(false) })
  }

  const categories = useMemo(() => ['All categories', ...new Set(products.map((p) => p.category).filter(Boolean))], [products])

  const filtered = useMemo(() => products.filter((p) => {
    const matchesSearch = !search || [p.name, p.category, p.supplier].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = categoryFilter === 'All categories' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  }), [products, search, categoryFilter])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    await api.products.insert(form)
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm())
    refresh()
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Master catalogue of food additives & chemicals."
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <IconPlus width={15} height={15} /> New Product
          </button>
        }
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search name, category, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Product</th><th>Category</th><th>Supplier</th><th>Origin</th><th>MOQ</th><th>Docs</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={7}>Loading products…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={7}>No products match.</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id}>
                <td className="cell-strong">{p.name}</td>
                <td>{p.category}</td>
                <td className="cell-muted">{p.supplier || '—'}</td>
                <td className="cell-muted">{p.origin || '—'}</td>
                <td className="cell-mono">{p.moq || '—'}</td>
                <td className="cell-muted">{p.docs || '—'}</td>
                <td><Pill>{p.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title="New Product"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="product-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save product'}
              </button>
            </>
          }
        >
          <form id="product-form" onSubmit={handleCreate}>
            <div className="field">
              <label>Product name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Category</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="field">
                <label>Supplier</label>
                <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Origin</label>
                <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
              </div>
              <div className="field">
                <label>MOQ</label>
                <input value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} placeholder="e.g. 50 kg" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Docs available</label>
                <input value={form.docs} onChange={(e) => setForm({ ...form, docs: e.target.value })} placeholder="COA, MSDS, Halal" />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
