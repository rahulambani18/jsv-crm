import { useEffect, useMemo, useState } from 'react'
import { api, storage } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconSearch, IconEdit, IconTrash } from '../components/Icons.jsx'
import '../styles/components.css'

const DOC_TYPES = ['COA', 'MSDS', 'TDS', 'Certificate', 'Contract', 'Invoice', 'Purchase Order', 'Email', 'Other']

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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
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
    if (editingId) await api.documents.update(editingId, record)
    else await api.documents.insert(record)
    setSaving(false); setShowModal(false); setForm(emptyForm()); setEditingId(null); refresh()
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.name}"?`)) return
    await api.documents.remove(doc.id); refresh()
  }

  const typeIcon = { COA: '🧪', MSDS: '⚠️', TDS: '📋', Certificate: '🏅', Contract: '📄', Invoice: '🧾', 'Purchase Order': '📦', Email: '📧', Other: '📁' }
  const typeTone = { COA: 'teal', MSDS: 'amber', TDS: 'navy', Certificate: 'teal', Contract: 'navy', Invoice: 'gray', 'Purchase Order': 'gray', Email: 'navy', Other: 'gray' }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${docs.length} document${docs.length === 1 ? '' : 's'} — COAs, MSDS, certificates, contracts`}
        actions={canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <IconPlus width={15} height={15} /> Add Document
          </button>
        )}
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
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Document</th><th>Type</th><th>Product</th><th>Tags</th><th>Added by</th><th>Date</th><th>Link</th>{(canEdit || canDelete) && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={(canEdit || canDelete) ? 8 : 7}>Loading documents…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={(canEdit || canDelete) ? 8 : 7}>{docs.length === 0 ? 'No documents yet. Add COAs, MSDS sheets, contracts and more.' : 'No documents match.'}</td></tr>
            ) : filtered.map((d) => (
              <tr key={d.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{typeIcon[d.type] || '📁'}</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{d.name}</span>
                  </div>
                </td>
                <td><Pill tone={typeTone[d.type] || 'gray'}>{d.type}</Pill></td>
                <td className="cell-muted">{d.relatedProduct || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(d.tags || []).map((tag) => (
                      <span key={tag} style={{ fontSize: 11, background: 'var(--paper-100)', color: 'var(--ink-500)', padding: '2px 7px', borderRadius: 100 }}>{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="cell-muted">{d.uploadedBy || '—'}</td>
                <td className="cell-mono">{d.date || '—'}</td>
                <td>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-600)', textDecoration: 'none' }}>
                      📄 Open
                    </a>
                  ) : (
                    <span className="cell-muted">—</span>
                  )}
                </td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}><IconEdit width={13} height={13} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(d)}><IconTrash width={13} height={13} /></button>}
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
