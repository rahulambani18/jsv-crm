import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { readSpreadsheetFile, normalizeRow } from '../lib/fileImport.js'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconSearch, IconUpload, IconEdit, IconTrash } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import '../styles/components.css'

const PRODUCT_FIELD_MAP = {
  name: ['name', 'product', 'productname'],
  category: ['category'],
  supplier: ['supplier'],
  origin: ['origin'],
  moq: ['moq'],
  docs: ['docs', 'documents'],
  unitPrice: ['unitprice', 'price', 'rate'],
}

function emptyForm() {
  return { name: '', category: '', supplier: '', origin: '', moq: '', docs: '', docUrl: '', unitPrice: '', status: 'Active' }
}

export default function Products() {
  const { can } = useAuth()
  const canEdit = can('products', 'edit')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [importError, setImportError] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const fileInputRef = useRef(null)

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

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  function openEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name || '', category: product.category || '', supplier: product.supplier || '',
      origin: product.origin || '', moq: product.moq || '', docs: product.docs || '',
      docUrl: product.docUrl || '', unitPrice: product.unitPrice ?? '', status: product.status || 'Active',
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const record = { ...form, unitPrice: Number(form.unitPrice) || 0 }
    if (editingId) {
      await api.products.update(editingId, record)
    } else {
      await api.products.insert(record)
    }
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm())
    setEditingId(null)
    refresh()
  }

  async function toggleStatus(product) {
    await api.products.update(product.id, { status: product.status === 'Active' ? 'Inactive' : 'Active' })
    refresh()
  }

  async function handleDelete(product) {
    if (!window.confirm(`Remove "${product.name}" from the catalogue? This can't be undone.`)) return
    await api.products.remove(product.id)
    refresh()
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    setImportBusy(true)
    try {
      const rows = await readSpreadsheetFile(file)
      const imported = rows
        .map((row) => normalizeRow(row, PRODUCT_FIELD_MAP))
        .filter((r) => r.name)
        .map((r) => ({ ...r, unitPrice: Number(r.unitPrice) || 0, status: 'Active' }))

      if (imported.length === 0) {
        setImportError('No valid rows found. Make sure the file has a "name" column (Product Name also works).')
      } else {
        await Promise.all(imported.map((r) => api.products.insert(r)))
        refresh()
      }
    } catch (err) {
      setImportError(err.message || 'Could not import this file.')
    } finally {
      setImportBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Master catalogue of food additives & chemicals."
        actions={
          canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
              <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importBusy}>
                <IconUpload width={15} height={15} /> {importBusy ? 'Importing…' : 'Import Excel/CSV'}
              </button>
              <button className="btn btn-primary" onClick={openCreate}>
                <IconPlus width={15} height={15} /> New Product
              </button>
            </>
          )
        }
      />

      {importError && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
          {importError}
        </div>
      )}

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
            <tr><th>Product</th><th>Category</th><th>Supplier</th><th>Origin</th><th>MOQ</th><th>Unit Price</th><th>Docs</th><th>Status</th>{canEdit && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={canEdit ? 9 : 8}>Loading products…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={canEdit ? 9 : 8}>No products match.</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} style={{ opacity: p.status === 'Inactive' ? 0.55 : 1 }}>
                <td className="cell-strong">{p.name}</td>
                <td>{p.category}</td>
                <td className="cell-muted">{p.supplier || '—'}</td>
                <td className="cell-muted">{p.origin || '—'}</td>
                <td className="cell-mono">{p.moq || '—'}</td>
                <td className="cell-mono">{p.unitPrice ? `₹${Number(p.unitPrice).toLocaleString('en-IN')}/kg` : '—'}</td>
                <td>
                  {p.docUrl ? (
                    <a href={p.docUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-600)', textDecoration: 'none' }}>
                      📄 View
                    </a>
                  ) : (
                    <span className="cell-muted">{p.docs || '—'}</span>
                  )}
                </td>
                <td><Pill>{p.status}</Pill></td>
                {canEdit && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit"><IconEdit width={13} height={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(p)} title={p.status === 'Active' ? 'Mark inactive' : 'Mark active'}>
                        {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(p)} title="Remove"><IconTrash width={13} height={13} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Edit Product' : 'New Product'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="product-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save product'}
              </button>
            </>
          }
        >
          <form id="product-form" onSubmit={handleSave}>
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
                <label>Unit price (₹/kg)</label>
                <input type="number" min="0" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="Used to prefill order line items" />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Docs available (text list)</label>
              <input value={form.docs} onChange={(e) => setForm({ ...form, docs: e.target.value })} placeholder="COA, MSDS, Halal, Kosher…" />
            </div>
            <div className="field">
              <label>Document link (COA / MSDS / TDS)</label>
              <input
                value={form.docUrl || ''}
                onChange={(e) => setForm({ ...form, docUrl: e.target.value })}
                placeholder="Paste Google Drive / Dropbox share link for COA, MSDS, etc."
              />
              <p style={{ fontSize: 11.5, color: 'var(--ink-400)', margin: '4px 0 0' }}>
                Upload the document to Google Drive, copy the share link, and paste it here.
              </p>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
