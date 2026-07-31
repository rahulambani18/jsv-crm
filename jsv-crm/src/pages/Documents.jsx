import { useEffect, useMemo, useState } from 'react'
import { api, storage } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ExportBar from '../components/ExportBar.jsx'
import { IconPlus, IconSearch, IconEdit, IconTrash } from '../components/Icons.jsx'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import ClearFiltersButton from '../components/ClearFiltersButton.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'

const DOC_TYPES = ['COA', 'MSDS', 'TDS', 'Certificate', 'Contract', 'Invoice', 'Purchase Order', 'Email', 'Other']

const DOCUMENT_COLUMNS = [
  { key: 'name', label: 'Document' },
  { key: 'type', label: 'Type' },
  { key: 'relatedProduct', label: 'Product' },
  { key: 'tags', label: 'Tags' },
  { key: 'uploadedBy', label: 'Added by' },
  { key: 'date', label: 'Date' },
  { key: 'link', label: 'Link' },
]

function emptyForm() {
  return { name: '', type: 'COA', relatedProduct: '', url: '', tags: '', date: new Date().toISOString().slice(0, 10), uploadedBy: '' }
}

export default function Documents() {
  const { user, can } = useAuth()
  const canEdit = can('documents', 'edit')
  const canDelete = can('documents', 'delete')
  const [docs, setDocs] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCols, setVisibleCols] = useState(DOCUMENT_COLUMNS.map((c) => c.key))
  const [search, setSearch, searchMeta] = usePersistedFilter('jsv_filter_documents_search', undefined, '')
  const [typeFilter, setTypeFilter, typeMeta] = usePersistedFilter('jsv_filter_documents_type', undefined, 'All types')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => { refresh() }, [])
  useAutoRefresh(() => refresh(true), 60000)

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([api.documents.list(), api.products.list()]).then(([d, p]) => {
      setDocs(d); setProducts(p); setLoading(false)
    })
  }

  const productOptions = useMemo(() => products.map((p) => p.name), [products])

  const filtered = useMemo(() => docs.filter((d) => {
    const matchType = typeFilter === 'All types' || d.type === typeFilter
    const matchSearch = !search || [d.name, d.relatedProduct, d.uploadedBy, ...(d.tags || [])].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    return matchType && matchSearch
  }), [docs, search, typeFilter])

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm(), uploadedBy: user?.name || '' })
    setUploadError('')
    setShowModal(true)
  }

  function openEdit(doc) {
    setEditingId(doc.id)
    setForm({ name: doc.name || '', type: doc.type || 'COA', relatedProduct: doc.relatedProduct || '', url: doc.url || '', tags: (doc.tags || []).join(', '), date: doc.date || '', uploadedBy: doc.uploadedBy || '' })
    setUploadError('')
    setShowModal(true)
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const { url } = await storage.uploadFile(file, 'documents')
      setForm((f) => ({ ...f, url, name: f.name || file.name.replace(/\.[^/.]+$/, '') }))
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Make sure the "attachments" storage bucket exists in Supabase.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const record = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) }
    try {
      if (editingId) await api.documents.update(editingId, record)
      else await api.documents.insert(record)
      setShowModal(false); setForm(emptyForm()); setEditingId(null); refresh()
    } catch (err) {
      alert('Could not save document: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.name}"?`)) return
    try {
      await api.documents.remove(doc.id); refresh()
    } catch (err) {
      alert('Could not delete: ' + (err.message || 'Unknown error'))
    }
  }

  const typeIcon = { COA: '🧪', MSDS: '⚠️', TDS: '📋', Certificate: '🏅', Contract: '📄', Invoice: '🧾', 'Purchase Order': '📦', Email: '📧', Other: '📁' }
  const typeTone = { COA: 'teal', MSDS: 'amber', TDS: 'navy', Certificate: 'teal', Contract: 'navy', Invoice: 'gray', 'Purchase Order': 'gray', Email: 'navy', Other: 'gray' }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={docs.length === 0 ? 'No documents yet' : `${docs.length} document${docs.length === 1 ? '' : 's'} — COAs, MSDS, certificates, contracts`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Documents"
              headers={['Document', 'Type', 'Product', 'Tags', 'Added By', 'Date', 'Link']}
              rows={filtered.map((d) => [d.name, d.type, d.relatedProduct, (d.tags || []).join('; '), d.uploadedBy, d.date, d.url])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={openCreate}>
                <IconPlus width={15} height={15} /> Add Document
              </button>
            )}
          </div>
        }
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search documents, products, tags…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option>All types</option>
          {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <ColumnChooser columns={DOCUMENT_COLUMNS} storageKey="jsv_cols_documents" onChange={setVisibleCols} />
        <ClearFiltersButton filters={[searchMeta, typeMeta]} onClear={() => { searchMeta.clear(); typeMeta.clear() }} />
      </div>

      <div className="table-wrap sticky-first-col">
        <table className="data-table">
          <thead>
            <tr>{visibleCols.map((key) => (
              <th key={key}>{DOCUMENT_COLUMNS.find((c) => c.key === key)?.label}</th>
            ))}{(canEdit || canDelete) && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={visibleCols.length + ((canEdit || canDelete) ? 1 : 0)} rows={6} />
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + ((canEdit || canDelete) ? 1 : 0)}>
                {docs.length === 0 ? (
                  <EmptyState
                    icon="📁"
                    title="No documents yet"
                    subtitle="Add COAs, MSDS sheets, contracts and more."
                    actionLabel={canEdit ? 'Add Document' : undefined}
                    onAction={canEdit ? () => setShowModal(true) : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No documents match" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : filtered.map((d) => {
              const cell = (key) => {
                switch (key) {
                  case 'name': return (
                    <td key={key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{typeIcon[d.type] || '📁'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{d.name}</span>
                      </div>
                    </td>
                  )
                  case 'type': return <td key={key}><Pill tone={typeTone[d.type] || 'gray'}>{d.type}</Pill></td>
                  case 'relatedProduct': return <td key={key} className="cell-muted">{d.relatedProduct || '—'}</td>
                  case 'tags': return (
                    <td key={key}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(d.tags || []).map((tag) => (
                          <span key={tag} style={{ fontSize: 11, background: 'var(--paper-100)', color: 'var(--ink-500)', padding: '2px 7px', borderRadius: 100 }}>{tag}</span>
                        ))}
                      </div>
                    </td>
                  )
                  case 'uploadedBy': return <td key={key} className="cell-muted">{d.uploadedBy || '—'}</td>
                  case 'date': return <td key={key} className="cell-mono">{d.date || '—'}</td>
                  case 'link': return (
                    <td key={key}>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-600)', textDecoration: 'none' }}>
                          📄 Open
                        </a>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                  )
                  default: return null
                }
              }
              return (
              <tr key={d.id}>
                {visibleCols.map((key) => cell(key))}
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}><IconEdit width={13} height={13} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(d)}><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Edit Document' : 'Add Document'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="doc-form" type="submit" disabled={saving || uploading}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add document'}
              </button>
            </>
          }
        >
          <form id="doc-form" onSubmit={handleSave}>
            <div className="field">
              <label>Document name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Citric Acid COA Batch #CIT2604" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Related product</label>
                <input list="doc-products" value={form.relatedProduct} onChange={(e) => setForm({ ...form, relatedProduct: e.target.value })} placeholder="Select or type…" />
                <datalist id="doc-products">{productOptions.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
            </div>
            <div className="field">
              <label>Attach a file (PDF, Excel, Image, PO, etc.)</label>
              <input
                type="file"
                accept=".pdf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.eml,.msg,.doc,.docx"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {uploading && <p style={{ fontSize: 11.5, color: 'var(--ink-400)', margin: '4px 0 0' }}>Uploading…</p>}
              {uploadError && <p style={{ fontSize: 11.5, color: 'var(--red-600)', margin: '4px 0 0' }}>{uploadError}</p>}
              {form.url && !uploading && (
                <p style={{ fontSize: 11.5, color: 'var(--teal-700)', margin: '4px 0 0' }}>✓ File attached — <a href={form.url} target="_blank" rel="noopener noreferrer">preview</a></p>
              )}
            </div>
            <div className="field">
              <label>Or paste a link instead (Google Drive / Dropbox share URL)</label>
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://drive.google.com/…" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="field">
                <label>Added by</label>
                <input value={form.uploadedBy} onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Tags (comma separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="COA, Halal, Food Grade, Batch #123" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
