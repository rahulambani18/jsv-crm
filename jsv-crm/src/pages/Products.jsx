import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { readSpreadsheetFile, normalizeRow } from '../lib/fileImport.js'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconSearch, IconUpload, IconEdit, IconTrash } from '../components/Icons.jsx'
import ExportBar from '../components/ExportBar.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import Pagination from '../components/Pagination.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'

const PRODUCT_COLUMNS = [
  { key: 'name', label: 'Product' },
  { key: 'category', label: 'Category' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'origin', label: 'Origin' },
  { key: 'moq', label: 'MOQ' },
  { key: 'unitPrice', label: 'Unit Price' },
  { key: 'docs', label: 'Docs' },
  { key: 'status', label: 'Status' },
]

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
  const canDelete = can('products', 'delete')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCols, setVisibleCols] = useState(PRODUCT_COLUMNS.map((c) => c.key))
  const [searchParams] = useSearchParams()
  const [search, setSearch] = usePersistedFilter('jsv_filter_products_search', searchParams.get('q'), '')
  const [categoryFilter, setCategoryFilter] = usePersistedFilter('jsv_filter_products_category', undefined, 'All categories')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [importError, setImportError] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const fileInputRef = useRef(null)
  const [selected, setSelected] = useState(new Set())

  useEffect(() => { refresh() }, [])
  useAutoRefresh(() => refresh(true), 60000)

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    api.products.list().then((data) => { setProducts(data); setLoading(false) })
  }

  const categories = useMemo(() => ['All categories', ...new Set(products.map((p) => p.category).filter(Boolean))], [products])

  const filtered = useMemo(() => products.filter((p) => {
    const matchesSearch = !search || [p.name, p.category, p.supplier].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = categoryFilter === 'All categories' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  }), [products, search, categoryFilter])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search, categoryFilter])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

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
    try {
      const record = {
        ...form,
        unitPrice: Number(form.unitPrice) || 0,
        workspaceId: '00000000-0000-0000-0000-000000000001',
      }
      if (editingId) {
        await api.products.update(editingId, record)
      } else {
        await api.products.insert(record)
      }
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      refresh()
    } catch (err) {
      alert('Could not save product: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
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

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))
    )
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Remove ${count} product${count === 1 ? '' : 's'} from the catalogue? This can't be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.products.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} product${count === 1 ? '' : 's'} removed`)
    } catch (err) {
      showToast('Could not remove selected products: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((p) => selected.has(p.id))
    exportCSV(
      'Products',
      ['Product', 'Category', 'Supplier', 'Origin', 'MOQ', 'Unit Price', 'Status'],
      rows.map((p) => [p.name, p.category, p.supplier, p.origin, p.moq, p.unitPrice ? `₹${Number(p.unitPrice).toLocaleString('en-IN')}` : '', p.status])
    )
  }

  async function handleBulkStatus(status) {
    if (!status) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.products.update(id, { status })))
      setSelected(new Set())
      refresh()
      showToast(`${count} product${count === 1 ? '' : 's'} marked ${status}`)
    } catch (err) {
      showToast('Could not update status: ' + (err.message || 'Unknown error'), 'error')
    }
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
              <ExportBar
                title="Products"
                headers={['Product', 'Category', 'Supplier', 'Origin', 'MOQ', 'Unit Price', 'Status']}
                rows={filtered.map((p) => [p.name, p.category, p.supplier, p.origin, p.moq, p.unitPrice ? `₹${Number(p.unitPrice).toLocaleString('en-IN')}` : '', p.status])}
                count={filtered.length}
              />
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
        <ColumnChooser columns={PRODUCT_COLUMNS} storageKey="jsv_cols_products" onChange={setVisibleCols} />
      </div>

      {canEdit && (
        <BulkActionsBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onExport={handleBulkExport}
          onDelete={canDelete ? handleBulkDelete : undefined}
        >
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkStatus(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Set status…</option>
            <option value="Active">Activate</option>
            <option value="Inactive">Deactivate</option>
          </select>
        </BulkActionsBar>
      )}

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
                <th key={key}>{PRODUCT_COLUMNS.find((c) => c.key === key)?.label}</th>
              ))}
              {(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={visibleCols.length + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)} rows={6} />
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)}>
                {products.length === 0 ? (
                  <EmptyState
                    icon="🧪"
                    title="No products yet"
                    subtitle="Add your first product to build your catalog."
                    actionLabel={canEdit ? 'New Product' : undefined}
                    onAction={canEdit ? openCreate : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No products match" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : paged.map((p) => {
              const cell = (key) => {
                switch (key) {
                  case 'name': return <td key={key} className="cell-strong">{p.name}</td>
                  case 'category': return <td key={key}>{p.category}</td>
                  case 'supplier': return <td key={key} className="cell-muted">{p.supplier || '—'}</td>
                  case 'origin': return <td key={key} className="cell-muted">{p.origin || '—'}</td>
                  case 'moq': return <td key={key} className="cell-mono">{p.moq || '—'}</td>
                  case 'unitPrice': return <td key={key} className="cell-mono">{p.unitPrice ? `₹${Number(p.unitPrice).toLocaleString('en-IN')}/kg` : '—'}</td>
                  case 'docs': return (
                    <td key={key}>
                      {p.docUrl ? (
                        <a href={p.docUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-600)', textDecoration: 'none' }}>
                          📄 View
                        </a>
                      ) : (
                        <span className="cell-muted">{p.docs || '—'}</span>
                      )}
                    </td>
                  )
                  case 'status': return <td key={key}><Pill>{p.status}</Pill></td>
                  default: return null
                }
              }
              return (
              <tr key={p.id} style={{ opacity: p.status === 'Inactive' ? 0.55 : 1 }}>
                {canEdit && (
                  <td className="header-checkbox-cell">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} />
                  </td>
                )}
                {visibleCols.map((key) => cell(key))}
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit"><IconEdit width={13} height={13} /></button>}
                      {canEdit && (
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(p)} title={p.status === 'Active' ? 'Mark inactive' : 'Mark active'}>
                          {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(p)} title="Remove"><IconTrash width={13} height={13} /></button>}
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
