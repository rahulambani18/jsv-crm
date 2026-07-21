import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { INDIAN_STATES } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Modal from '../components/Modal.jsx'
import Pill from '../components/Pill.jsx'
import StatCard from '../components/StatCard.jsx'
import Dropdown from '../components/Dropdown.jsx'
import ComboField from '../components/ComboField.jsx'
import SendButtons from '../components/SendButtons.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import { IconPlus, IconSearch, IconBox, IconEdit, IconTrash } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'

const TYPES = ['Own', 'Rented', '3PL']
const STATUSES = ['Active', 'Inactive']

function emptyForm() {
  return {
    name: '', code: '', type: 'Own', address: '', city: '', state: '',
    manager: '', phone: '', email: '', capacity: '', capacityUnit: 'sq ft',
    status: 'Active', notes: '',
  }
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

function stockStatus(row) {
  if (Number(row.qtyOnHand) <= 0) return 'Out of Stock'
  if (Number(row.reorderLevel) > 0 && Number(row.qtyOnHand) <= Number(row.reorderLevel)) return 'Low Stock'
  return 'In Stock'
}

export default function Warehouses() {
  const { can } = useAuth()
  const canEdit = can('warehouses', 'edit')
  const canDelete = can('warehouses', 'delete')

  const [warehouses, setWarehouses] = useState([])
  const [stock, setStock] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.warehouses.list(), api.stock.list(), api.products.list()])
      .then(([w, s, p]) => { setWarehouses(w); setStock(s); setProducts(p); setLoading(false) })
      .catch((err) => { showToast('Could not load warehouses: ' + (err.message || 'Unknown error'), 'error'); setLoading(false) })
  }

  const priceByProduct = useMemo(() => {
    const map = {}
    products.forEach((p) => { map[p.name] = p.unitPrice })
    return map
  }, [products])

  // Live stats per warehouse, computed from Inventory's stock table —
  // never stored, always reflects the current numbers.
  const statsByWarehouse = useMemo(() => {
    const map = {}
    stock.forEach((s) => {
      if (!map[s.warehouse]) map[s.warehouse] = { skus: 0, value: 0, low: 0, out: 0 }
      const bucket = map[s.warehouse]
      bucket.skus += 1
      bucket.value += Number(s.qtyOnHand || 0) * Number(priceByProduct[s.product] || 0)
      const status = stockStatus(s)
      if (status === 'Low Stock') bucket.low += 1
      if (status === 'Out of Stock') bucket.out += 1
    })
    return map
  }, [stock, priceByProduct])

  const totals = useMemo(() => {
    const active = warehouses.filter((w) => w.status === 'Active').length
    const totalValue = Object.values(statsByWarehouse).reduce((s, b) => s + b.value, 0)
    const totalLow = Object.values(statsByWarehouse).reduce((s, b) => s + b.low + b.out, 0)
    return { count: warehouses.length, active, totalValue, totalLow }
  }, [warehouses, statsByWarehouse])

  const filtered = useMemo(() => warehouses.filter((w) => {
    const matchesSearch = !search || [w.name, w.code, w.city, w.manager].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchesType = typeFilter === 'All types' || w.type === typeFilter
    return matchesSearch && matchesType
  }), [warehouses, search, typeFilter])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  function openEdit(w) {
    setEditingId(w.id)
    setForm({ ...emptyForm(), ...w, capacity: w.capacity ?? '' })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const record = { ...form, capacity: Number(form.capacity) || 0 }
      if (editingId) {
        await api.warehouses.update(editingId, record)
        showToast('Warehouse updated successfully')
      } else {
        await api.warehouses.insert(record)
        showToast('Warehouse created successfully')
      }
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      refresh()
    } catch (err) {
      showToast('Could not save warehouse: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(w) {
    await api.warehouses.update(w.id, { status: w.status === 'Active' ? 'Inactive' : 'Active' })
    refresh()
  }

  async function handleDelete(w) {
    const bucket = statsByWarehouse[w.name]
    if (bucket && bucket.skus > 0) {
      if (!window.confirm(`${w.name} still has ${bucket.skus} SKU${bucket.skus === 1 ? '' : 's'} tracked in Inventory. Delete the warehouse record anyway? Stock rows will stay but won't be linked to a warehouse profile.`)) return
    } else if (!window.confirm(`Delete warehouse "${w.name}"? This cannot be undone.`)) {
      return
    }
    try {
      await api.warehouses.remove(w.id)
      refresh()
      showToast('Warehouse deleted')
    } catch (err) {
      showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error')
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
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((w) => w.id))))
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} warehouse${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.warehouses.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} warehouse${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected warehouses: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((w) => selected.has(w.id))
    exportCSV('Warehouses', ['Name', 'Code', 'Type', 'City', 'State', 'Manager', 'Phone', 'Capacity', 'Status'],
      rows.map((w) => [w.name, w.code, w.type, w.city, w.state, w.manager, w.phone, `${w.capacity} ${w.capacityUnit || ''}`, w.status]))
  }

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle={`${warehouses.length} warehouse${warehouses.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Warehouses"
              headers={['Name', 'Code', 'Type', 'City', 'State', 'Manager', 'Phone', 'Capacity', 'Status']}
              rows={filtered.map((w) => [w.name, w.code, w.type, w.city, w.state, w.manager, w.phone, `${w.capacity} ${w.capacityUnit || ''}`, w.status])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={openCreate}>
                <IconPlus width={15} height={15} /> New Warehouse
              </button>
            )}
          </div>
        }
      />

      <div className="stats-grid">
        <StatCard icon={IconBox} tone="blue" label="Warehouses" value={totals.count} />
        <StatCard icon={IconBox} tone="teal" label="Active" value={totals.active} />
        <StatCard icon={IconBox} tone="amber" label="Low / Out of Stock (all sites)" value={totals.totalLow} />
        <StatCard icon={IconBox} tone="navy" label="Stock Value (est., all sites)" value={formatINR(totals.totalValue)} mono />
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search name, code, city, manager…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dropdown options={['All types', ...TYPES]} value={typeFilter} onChange={setTypeFilter} />
      </div>

      {canEdit && (
        <BulkActionsBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onExport={handleBulkExport}
          onDelete={canDelete ? handleBulkDelete : undefined}
        />
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {canEdit && (
                <th className="header-checkbox-cell">
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll} />
                </th>
              )}
              <th>Code</th><th>Name</th><th>Type</th><th>City / State</th><th>Manager</th>
              <th>SKUs</th><th>Stock Value</th><th>Alerts</th><th>Status</th>{(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={11}>Loading warehouses…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={11}>{warehouses.length === 0 ? 'No warehouses yet.' : 'No warehouses match your search.'}</td></tr>
            ) : filtered.map((w) => {
              const bucket = statsByWarehouse[w.name] || { skus: 0, value: 0, low: 0, out: 0 }
              const alerts = bucket.low + bucket.out
              return (
                <tr key={w.id}>
                  {canEdit && (
                    <td className="row-checkbox-cell">
                      <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggleSelected(w.id)} />
                    </td>
                  )}
                  <td className="cell-mono">{w.code}</td>
                  <td className="cell-strong">{w.name}</td>
                  <td><span className="pill pill-navy">{w.type}</span></td>
                  <td>{w.city}{w.state ? `, ${w.state}` : ''}</td>
                  <td>{w.manager}<br /><span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{w.phone}</span></td>
                  <td className="cell-mono">{bucket.skus}</td>
                  <td className="cell-mono">{formatINR(bucket.value)}</td>
                  <td>{alerts > 0 ? <Pill tone="red">{alerts} alert{alerts === 1 ? '' : 's'}</Pill> : <span className="cell-muted">—</span>}</td>
                  <td>
                    {canEdit ? (
                      <button className={`pill pill-${w.status === 'Active' ? 'teal' : 'gray'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggleStatus(w)}>
                        {w.status}
                      </button>
                    ) : (
                      <Pill>{w.status}</Pill>
                    )}
                  </td>
                  {(canEdit || canDelete) && (
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)} title="Edit"><IconEdit width={13} height={13} /></button>}
                        <SendButtons
                          phone={w.phone} email={w.email}
                          whatsappMessage={`Hi ${w.manager || ''}, this is JSV Ingredient regarding ${w.name}.`}
                          mailSubject={`Regarding ${w.name}`}
                          mailBody={`Dear ${w.manager || ''},\n\n\n\nRegards,\nJSV Ingredient`}
                        />
                        {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(w)}><IconTrash width={13} height={13} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Edit Warehouse' : 'New Warehouse'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="warehouse-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save warehouse'}
              </button>
            </>
          }
        >
          <form id="warehouse-form" onSubmit={handleSave}>
            <div className="field-row">
              <div className="field">
                <label>Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mumbai (Bhiwandi)" />
              </div>
              <div className="field">
                <label>Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. WH-MUM" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Type</label>
                <Dropdown options={TYPES} value={form.type} onChange={(v) => setForm({ ...form, type: v })} />
              </div>
              <div className="field">
                <label>Status</label>
                <Dropdown options={STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
              </div>
            </div>
            <div className="field">
              <label>Address</label>
              <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="field">
                <label>State</label>
                <ComboField value={form.state} onChange={(v) => setForm({ ...form, state: v })} options={INDIAN_STATES} placeholder="Select or type…" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Manager / contact person</label>
                <input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Capacity</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={{ flex: 1 }} />
                  <input value={form.capacityUnit} onChange={(e) => setForm({ ...form, capacityUnit: e.target.value })} style={{ width: 90 }} placeholder="sq ft" />
                </div>
              </div>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. 3PL billing terms, access hours…" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
