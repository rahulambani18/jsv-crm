import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { WAREHOUSES } from '../data/seed.js'
import { readSpreadsheetFile, normalizeRow } from '../lib/fileImport.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Modal from '../components/Modal.jsx'
import Pill from '../components/Pill.jsx'
import StatCard from '../components/StatCard.jsx'
import Dropdown from '../components/Dropdown.jsx'
import ComboField from '../components/ComboField.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import Pagination from '../components/Pagination.jsx'
import { IconPlus, IconSearch, IconLayers, IconTrash, IconClock, IconUpload } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import { expiryStatus } from '../lib/expiry.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'

const MOVEMENT_TYPES = ['Received', 'Dispatched', 'Adjustment', 'Return']

// Same column-name aliases the excel-stock-sync-agent uses, so a file
// that works with one works with the other — whichever one someone
// reaches for on a given day, the same spreadsheet format applies.
const STOCK_FIELD_MAP = {
  product: ['product', 'productname', 'item', 'itemname', 'sku', 'productcode'],
  warehouse: ['warehouse', 'location', 'godown', 'store', 'branch'],
  unit: ['unit', 'uom', 'units'],
  qty: ['qty', 'quantity', 'qtyonhand', 'closingstock', 'currentstock', 'availableqty', 'stock', 'stockqty', 'onhand'],
  reorderLevel: ['reorderlevel', 'reorderqty', 'minstock', 'minimumstock', 'reorderpoint'],
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

function formatUpdatedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const SOURCE_TONE = { 'Excel Sync': 'teal', 'Excel Import': 'navy', Manual: 'gray' }

function emptyEntryForm() {
  return {
    product: '', warehouse: WAREHOUSES[0] || '', type: 'Received',
    qty: '', reference: '', notes: '', date: new Date().toISOString().slice(0, 10),
    expiryDate: '',
  }
}

function statusFor(row) {
  if (Number(row.qtyOnHand) <= 0) return 'Out of Stock'
  if (Number(row.reorderLevel) > 0 && Number(row.qtyOnHand) <= Number(row.reorderLevel)) return 'Low Stock'
  return 'In Stock'
}

export default function Inventory() {
  const { can } = useAuth()
  const canEdit = can('inventory', 'edit')
  const canDelete = can('inventory', 'delete')

  const [stock, setStock] = useState([])
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const [showEntryModal, setShowEntryModal] = useState(false)
  const [entryForm, setEntryForm] = useState(emptyEntryForm())
  const [saving, setSaving] = useState(false)

  const [historyRow, setHistoryRow] = useState(null)
  const [selected, setSelected] = useState(new Set())

  const [importError, setImportError] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { refresh() }, [])

  // Location/godown suggestions: the starter list plus any locations
  // already in use across stock, so the list grows on its own as
  // people type new ones — no separate warehouse master to manage.
  const warehouseNames = useMemo(() => {
    const names = new Set(WAREHOUSES)
    stock.forEach((s) => { if (s.warehouse) names.add(s.warehouse) })
    return [...names]
  }, [stock])

  async function refresh() {
    setLoading(true)
    try {
      const [s, m, p] = await Promise.all([api.stock.list(), api.stockMovements.list(), api.products.list()])
      setStock(s)
      setMovements(m)
      setProducts(p)
    } catch (err) {
      showToast('Could not load inventory: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const priceByProduct = useMemo(() => {
    const map = {}
    products.forEach((p) => { map[p.name] = p.unitPrice })
    return map
  }, [products])

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    setImportBusy(true)
    try {
      const rows = await readSpreadsheetFile(file)
      const parsed = rows
        .map((row) => normalizeRow(row, STOCK_FIELD_MAP))
        .filter((r) => r.product && r.warehouse && r.qty !== '' && r.qty !== undefined)
        .map((r) => ({
          product: String(r.product).trim(),
          warehouse: String(r.warehouse).trim(),
          unit: r.unit ? String(r.unit).trim() : 'kg',
          qtyOnHand: Number(r.qty) || 0,
          reorderLevel: r.reorderLevel !== undefined && r.reorderLevel !== '' ? Number(r.reorderLevel) || 0 : undefined,
        }))

      if (parsed.length === 0) {
        setImportError('No valid rows found. Make sure the file has Product, Warehouse and Qty columns (see the excel-stock-sync-agent README for accepted column names).')
        return
      }

      let changed = 0
      for (const row of parsed) {
        const existing = stock.find((s) => s.product === row.product && s.warehouse === row.warehouse)
        const priorQty = existing ? Number(existing.qtyOnHand) : null
        if (priorQty === row.qtyOnHand && existing) continue // nothing changed for this row

        if (existing) {
          const patch = { qtyOnHand: row.qtyOnHand, updatedAt: new Date().toISOString(), source: 'Excel Import' }
          if (row.reorderLevel !== undefined) patch.reorderLevel = row.reorderLevel
          await api.stock.update(existing.id, patch)
        } else {
          await api.stock.insert({
            product: row.product, warehouse: row.warehouse, unit: row.unit,
            qtyOnHand: row.qtyOnHand, reorderLevel: row.reorderLevel || 0, source: 'Excel Import',
          })
        }
        changed++

        if (priorQty !== null && priorQty !== row.qtyOnHand) {
          await api.stockMovements.insert({
            product: row.product, warehouse: row.warehouse, type: 'Adjustment',
            qty: Math.abs(row.qtyOnHand - priorQty), reference: file.name, createdBy: 'Excel Import',
            notes: `Imported from spreadsheet — ${row.qtyOnHand > priorQty ? 'increased' : 'decreased'} by ${Math.abs(row.qtyOnHand - priorQty)} ${row.unit}`,
          })
        }
      }

      refresh()
      showToast(changed > 0 ? `Imported ${changed} row(s) from ${file.name}` : `Checked ${parsed.length} row(s), nothing changed`)
    } catch (err) {
      setImportError(err.message || 'Could not import this file.')
    } finally {
      setImportBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filtered = useMemo(() => {
    return stock.filter((s) => {
      const matchesSearch = !search || [s.product, s.warehouse].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
      const matchesWarehouse = warehouseFilter === 'All' || s.warehouse === warehouseFilter
      const matchesStatus = statusFilter === 'All' || statusFor(s) === statusFilter
      return matchesSearch && matchesWarehouse && matchesStatus
    })
  }, [stock, search, warehouseFilter, statusFilter])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search, warehouseFilter, statusFilter])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  const stats = useMemo(() => {
    const lowStock = stock.filter((s) => statusFor(s) === 'Low Stock').length
    const outOfStock = stock.filter((s) => statusFor(s) === 'Out of Stock').length
    const totalValue = stock.reduce((sum, s) => sum + Number(s.qtyOnHand || 0) * (priceByProduct[s.product] || 0), 0)
    const expiring = stock.filter((s) => Number(s.qtyOnHand) > 0 && ['Expired', 'Expiring Soon'].includes(expiryStatus(s))).length
    return { totalSkus: stock.length, lowStock, outOfStock, totalValue, expiring }
  }, [stock, priceByProduct])

  async function handleLogMovement(e) {
    e.preventDefault()
    if (!entryForm.product || !entryForm.warehouse || !Number(entryForm.qty)) {
      showToast('Product, warehouse and quantity are required', 'error')
      return
    }
    setSaving(true)
    const enteredQty = Number(entryForm.qty)
    const signedDelta =
      entryForm.type === 'Dispatched' ? -Math.abs(enteredQty) :
      entryForm.type === 'Adjustment' ? enteredQty :
      Math.abs(enteredQty) // Received | Return

    try {
      const existing = stock.find((s) => s.product === entryForm.product && s.warehouse === entryForm.warehouse)
      const nextQty = Math.max(0, Number(existing?.qtyOnHand || 0) + signedDelta)
      if (existing && Number(existing.qtyOnHand || 0) + signedDelta < 0) {
        showToast(`Only ${existing.qtyOnHand} on hand — quantity floored at 0`, 'error')
      }

      if (existing) {
        const patch = { qtyOnHand: nextQty, updatedAt: new Date().toISOString(), source: 'Manual' }
        // A fresh Received entry replaces the tracked expiry with the new
        // batch's date; other movement types leave the existing date alone.
        if (entryForm.type === 'Received' && entryForm.expiryDate) patch.expiryDate = entryForm.expiryDate
        await api.stock.update(existing.id, patch)
      } else {
        await api.stock.insert({
          product: entryForm.product, warehouse: entryForm.warehouse,
          unit: 'kg', qtyOnHand: Math.max(0, signedDelta), reorderLevel: 0,
          expiryDate: entryForm.expiryDate || null, source: 'Manual',
        })
      }

      await api.stockMovements.insert({
        product: entryForm.product, warehouse: entryForm.warehouse,
        type: entryForm.type, qty: Math.abs(enteredQty),
        reference: entryForm.reference, notes: entryForm.notes, date: entryForm.date,
      })

      setShowEntryModal(false)
      setEntryForm(emptyEntryForm())
      refresh()
      showToast(`Stock ${entryForm.type.toLowerCase()} logged for ${entryForm.product}`)
    } catch (err) {
      showToast('Could not log movement: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function openRestock(row) {
    setEntryForm({ ...emptyEntryForm(), product: row.product, warehouse: row.warehouse, type: 'Received' })
    setShowEntryModal(true)
  }

  async function handleReorderLevelBlur(row, value) {
    const level = Number(value) || 0
    if (level === Number(row.reorderLevel || 0)) return
    try {
      await api.stock.update(row.id, { reorderLevel: level, updatedAt: new Date().toISOString() })
      refresh()
    } catch (err) {
      showToast('Could not update reorder level: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleExpiryDateBlur(row, value) {
    const next = value || null
    if (next === (row.expiryDate || null)) return
    try {
      await api.stock.update(row.id, { expiryDate: next, updatedAt: new Date().toISOString() })
      refresh()
    } catch (err) {
      showToast('Could not update expiry date: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleDeleteRow(row) {
    if (!confirm(`Stop tracking "${row.product}" at ${row.warehouse}? Movement history is kept, only the stock line is removed.`)) return
    try {
      await api.stock.remove(row.id)
      refresh()
      showToast(`Removed ${row.product} from ${row.warehouse}`)
    } catch (err) {
      showToast('Could not remove: ' + (err.message || 'Unknown error'), 'error')
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
    if (!confirm(`Stop tracking ${count} stock line${count === 1 ? '' : 's'}? Movement history is kept.`)) return
    try {
      await Promise.all([...selected].map((id) => api.stock.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} stock line${count === 1 ? '' : 's'} removed`)
    } catch (err) {
      showToast('Could not remove selected: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((s) => selected.has(s.id))
    exportCSV(
      'Inventory',
      ['Product', 'Warehouse', 'Qty On Hand', 'Unit', 'Reorder Level', 'Status', 'Expiry Date', 'Expiry Status', 'Last Updated', 'Source'],
      rows.map((s) => [s.product, s.warehouse, s.qtyOnHand, s.unit, s.reorderLevel, statusFor(s), s.expiryDate || '', expiryStatus(s) || '', s.updatedAt || '', s.source || ''])
    )
  }

  const historyRows = historyRow
    ? movements
        .filter((m) => m.product === historyRow.product && m.warehouse === historyRow.warehouse)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    : []

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${stock.length} SKUs tracked`}
        actions={
          <>
            {canEdit && (
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
              </>
            )}
            <ExportBar
              title="Inventory"
              headers={['Product', 'Warehouse', 'Qty On Hand', 'Unit', 'Reorder Level', 'Status', 'Expiry Date', 'Expiry Status', 'Last Updated', 'Source']}
              rows={filtered.map((s) => [s.product, s.warehouse, s.qtyOnHand, s.unit, s.reorderLevel, statusFor(s), s.expiryDate || '', expiryStatus(s) || '', s.updatedAt || '', s.source || ''])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => { setEntryForm(emptyEntryForm()); setShowEntryModal(true) }}>
                <IconPlus width={16} height={16} /> Stock Entry
              </button>
            )}
          </>
        }
      />

      {importError && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
          {importError}
        </div>
      )}

      <div className="stat-grid">
        <StatCard icon={IconLayers} tone="blue" label="SKUs Tracked" value={stats.totalSkus} />
        <StatCard icon={IconClock} tone="amber" label="Low Stock" value={stats.lowStock} />
        <StatCard icon={IconTrash} tone="red" label="Out of Stock" value={stats.outOfStock} />
        <StatCard icon={IconClock} tone="red" label="Expiring / Expired" value={stats.expiring} />
        <StatCard icon={IconLayers} tone="teal" label="Stock Value (est.)" value={formatINR(stats.totalValue)} mono />
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={16} height={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, warehouse…" />
        </div>
        <Dropdown
          options={['All', ...warehouseNames]}
          value={warehouseFilter}
          onChange={setWarehouseFilter}
        />
        <Dropdown
          options={['All', 'In Stock', 'Low Stock', 'Out of Stock']}
          value={statusFilter}
          onChange={setStatusFilter}
        />
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
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th>Product</th><th>Warehouse</th><th>Qty On Hand</th><th>Unit</th>
              <th>Reorder Level</th><th>Status</th><th>Expiry Date</th><th>Last Updated</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={9 + (canEdit ? 1 : 0)}>Loading inventory…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={9 + (canEdit ? 1 : 0)}>
                {stock.length === 0 ? (
                  <EmptyState
                    icon="📦"
                    title="No stock tracked yet"
                    subtitle="Log a stock entry to start tracking what's on hand at each warehouse."
                    actionLabel={canEdit ? 'Stock Entry' : undefined}
                    onAction={canEdit ? () => { setEntryForm(emptyEntryForm()); setShowEntryModal(true) } : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No stock matches your filters" subtitle="Try adjusting your search or warehouse filter." />
                )}
              </td></tr>
            ) : paged.map((s) => {
              const status = statusFor(s)
              const productExists = products.some((p) => p.name === s.product)
              return (
                <tr key={s.id}>
                  {canEdit && (
                    <td className="row-checkbox-cell">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelected(s.id)} />
                    </td>
                  )}
                  <td className="cell-strong">
                    {productExists ? (
                      <Link to={`/products?q=${encodeURIComponent(s.product)}`}>{s.product}</Link>
                    ) : (
                      s.product
                    )}
                  </td>
                  <td>{s.warehouse}</td>
                  <td className="cell-mono">{Number(s.qtyOnHand).toLocaleString('en-IN')}</td>
                  <td>{s.unit}</td>
                  <td className="cell-mono">
                    {canEdit ? (
                      <input
                        type="number" min="0" defaultValue={s.reorderLevel}
                        style={{ width: 80 }}
                        onBlur={(e) => handleReorderLevelBlur(s, e.target.value)}
                      />
                    ) : (
                      s.reorderLevel
                    )}
                  </td>
                  <td><Pill tone={status === 'In Stock' ? 'teal' : status === 'Low Stock' ? 'amber' : 'red'}>{status}</Pill></td>
                  <td className="cell-mono">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      {canEdit ? (
                        <input
                          type="date" defaultValue={s.expiryDate || ''}
                          style={{ width: 140 }}
                          onBlur={(e) => handleExpiryDateBlur(s, e.target.value)}
                        />
                      ) : (
                        s.expiryDate || <span className="cell-muted">—</span>
                      )}
                      {expiryStatus(s) === 'Expired' && <Pill tone="red">Expired</Pill>}
                      {expiryStatus(s) === 'Expiring Soon' && <Pill tone="amber">Expiring Soon</Pill>}
                    </div>
                  </td>
                  <td className="cell-mono">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <span>{formatUpdatedAt(s.updatedAt)}</span>
                      {s.source && <Pill tone={SOURCE_TONE[s.source] || 'gray'}>{s.source}</Pill>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && status !== 'In Stock' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => openRestock(s)} title="Log a Received entry for this product/warehouse">
                          <IconPlus width={14} height={14} /> Restock
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => setHistoryRow(s)} title="View movement history">
                        <IconClock width={14} height={14} />
                      </button>
                      {canDelete && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteRow(s)} title="Stop tracking">
                          <IconTrash width={14} height={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />

      {showEntryModal && (
        <Modal
          title="Stock Entry"
          onClose={() => setShowEntryModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowEntryModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLogMovement} disabled={saving}>{saving ? 'Saving…' : 'Log Entry'}</button>
            </>
          }
        >
          <form onSubmit={handleLogMovement}>
            <div className="field-row">
              <div className="field">
                <label>Product</label>
                <Dropdown
                  options={products.map((p) => p.name)}
                  value={entryForm.product}
                  onChange={(v) => setEntryForm({ ...entryForm, product: v })}
                  placeholder="Select product…"
                />
              </div>
              <div className="field">
                <label>Location / Godown</label>
                <ComboField
                  options={warehouseNames}
                  value={entryForm.warehouse}
                  onChange={(v) => setEntryForm({ ...entryForm, warehouse: v })}
                  placeholder="Select location…"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Movement type</label>
                <Dropdown
                  options={MOVEMENT_TYPES}
                  value={entryForm.type}
                  onChange={(v) => setEntryForm({ ...entryForm, type: v })}
                />
              </div>
              <div className="field">
                <label>Quantity {entryForm.type === 'Adjustment' && <span className="cell-muted">(negative to reduce)</span>}</label>
                <input
                  type="number" value={entryForm.qty}
                  onChange={(e) => setEntryForm({ ...entryForm, qty: e.target.value })}
                  placeholder="e.g. 500"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Reference</label>
                <input
                  value={entryForm.reference}
                  onChange={(e) => setEntryForm({ ...entryForm, reference: e.target.value })}
                  placeholder="e.g. PO-4471 or ORD-2026-0301"
                />
              </div>
              <div className="field">
                <label>Date</label>
                <input
                  type="date" value={entryForm.date}
                  onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                />
              </div>
            </div>
            {entryForm.type === 'Received' && (
              <div className="field-row">
                <div className="field">
                  <label>Expiry Date <span className="cell-muted">(optional)</span></label>
                  <input
                    type="date" value={entryForm.expiryDate}
                    onChange={(e) => setEntryForm({ ...entryForm, expiryDate: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="field">
              <label>Notes</label>
              <input
                value={entryForm.notes}
                onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </form>
        </Modal>
      )}

      {historyRow && (
        <Modal title={`Movement history — ${historyRow.product} (${historyRow.warehouse})`} onClose={() => setHistoryRow(null)}>
          {historyRows.length === 0 ? (
            <p className="cell-muted">No movements logged yet for this product/warehouse.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Qty</th><th>Reference</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {historyRows.map((m) => (
                  <tr key={m.id}>
                    <td className="cell-mono">{m.date}</td>
                    <td><Pill tone={m.type === 'Dispatched' ? 'amber' : m.type === 'Adjustment' ? 'gray' : 'teal'}>{m.type}</Pill></td>
                    <td className="cell-mono">{m.qty}</td>
                    <td className="cell-mono">{m.reference || <span className="cell-muted">—</span>}</td>
                    <td>{m.notes || <span className="cell-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  )
}
