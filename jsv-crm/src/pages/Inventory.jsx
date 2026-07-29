import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
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
import {
  IconPlus, IconSearch, IconLayers, IconTrash, IconClock, IconUpload,
  IconBarcode, IconQrCode, IconTransfer, IconAlertTriangle,
} from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import { expiryStatus, EXPIRY_WARNING_DAYS } from '../lib/expiry.js'
import { availableQty, stockStatus } from '../lib/stockStatus.js'
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
const MOVEMENT_TONE = {
  Dispatched: 'amber', Adjustment: 'gray', Received: 'teal', Return: 'teal',
  'Transfer Out': 'navy', 'Transfer In': 'navy', Damaged: 'red', Reserved: 'amber', 'Write-off': 'red',
}

const EXPORT_HEADERS = [
  'Product', 'Warehouse', 'Qty On Hand', 'Available', 'Reserved', 'Damaged', 'Unit',
  'Reorder Level', 'Status', 'Batch Number', 'Lot Number', 'Manufacturing Date',
  'Expiry Date', 'Expiry Status', 'Barcode', 'Last Updated', 'Source',
]

function exportRow(s) {
  return [
    s.product, s.warehouse, s.qtyOnHand, availableQty(s), s.reservedQty || 0, s.damagedQty || 0, s.unit,
    s.reorderLevel, stockStatus(s), s.batchNumber || '', s.lotNumber || '', s.manufacturingDate || '',
    s.expiryDate || '', expiryStatus(s) || '', s.barcode || '', s.updatedAt || '', s.source || '',
  ]
}

function emptyEntryForm() {
  return {
    product: '', warehouse: WAREHOUSES[0] || '', type: 'Received',
    qty: '', reference: '', notes: '', date: new Date().toISOString().slice(0, 10),
    expiryDate: '', batchNumber: '', lotNumber: '', manufacturingDate: '',
  }
}

function emptyTransferForm(row) {
  return {
    product: row?.product || '', fromWarehouse: row?.warehouse || '', toWarehouse: '',
    qty: '', reference: '', notes: '', date: new Date().toISOString().slice(0, 10),
  }
}

// Generates a simple, deterministic-looking EAN-13-shaped code so a
// stock line always has *something* scannable even before a real
// barcode is assigned — "8" + India GS1 prefix stand-in + 9 digits
// derived from the current time, so codes don't collide in a demo.
function generateBarcode() {
  const digits = String(Date.now()).slice(-9)
  return `890${digits}`
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
  const [showArchived, setShowArchived] = useState(false)

  const [showEntryModal, setShowEntryModal] = useState(false)
  const [entryForm, setEntryForm] = useState(emptyEntryForm())
  const [saving, setSaving] = useState(false)

  const [historyRow, setHistoryRow] = useState(null)
  const [selected, setSelected] = useState(new Set())

  const [importError, setImportError] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const fileInputRef = useRef(null)

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferForm, setTransferForm] = useState(emptyTransferForm())
  const [transferring, setTransferring] = useState(false)

  const [batchRow, setBatchRow] = useState(null)
  const [batchForm, setBatchForm] = useState(null)
  const [savingBatch, setSavingBatch] = useState(false)

  const [qrRow, setQrRow] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrLoading, setQrLoading] = useState(false)

  const [showExpiryBanner, setShowExpiryBanner] = useState(true)

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
      const matchesStatus = statusFilter === 'All' || stockStatus(s) === statusFilter
      const matchesArchived = showArchived ? !!s.archived : !s.archived
      return matchesSearch && matchesWarehouse && matchesStatus && matchesArchived
    })
  }, [stock, search, warehouseFilter, statusFilter, showArchived])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search, warehouseFilter, statusFilter, showArchived])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  const stats = useMemo(() => {
    const lowStock = stock.filter((s) => stockStatus(s) === 'Low Stock').length
    const outOfStock = stock.filter((s) => stockStatus(s) === 'Out of Stock').length
    const totalValue = stock.reduce((sum, s) => sum + Number(s.qtyOnHand || 0) * (priceByProduct[s.product] || 0), 0)
    const expiring = stock.filter((s) => Number(s.qtyOnHand) > 0 && ['Expired', 'Expiring Soon'].includes(expiryStatus(s))).length
    const damagedSkus = stock.filter((s) => Number(s.damagedQty) > 0).length
    return { totalSkus: stock.length, lowStock, outOfStock, totalValue, expiring, damagedSkus }
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
        // A fresh Received entry replaces the tracked expiry/batch info
        // with the new batch's details; other movement types leave
        // whatever's currently on the stock line alone.
        if (entryForm.type === 'Received') {
          if (entryForm.expiryDate) patch.expiryDate = entryForm.expiryDate
          if (entryForm.batchNumber) patch.batchNumber = entryForm.batchNumber
          if (entryForm.lotNumber) patch.lotNumber = entryForm.lotNumber
          if (entryForm.manufacturingDate) patch.manufacturingDate = entryForm.manufacturingDate
        }
        await api.stock.update(existing.id, patch)
      } else {
        await api.stock.insert({
          product: entryForm.product, warehouse: entryForm.warehouse,
          unit: 'kg', qtyOnHand: Math.max(0, signedDelta), reorderLevel: 0,
          expiryDate: entryForm.expiryDate || null, source: 'Manual',
          batchNumber: entryForm.batchNumber || null, lotNumber: entryForm.lotNumber || null,
          manufacturingDate: entryForm.manufacturingDate || null,
        })
      }

      await api.stockMovements.insert({
        product: entryForm.product, warehouse: entryForm.warehouse,
        type: entryForm.type, qty: Math.abs(enteredQty),
        reference: entryForm.reference, notes: entryForm.notes, date: entryForm.date,
        ...(entryForm.type === 'Received' ? {
          batchNumber: entryForm.batchNumber || null,
          lotNumber: entryForm.lotNumber || null,
          manufacturingDate: entryForm.manufacturingDate || null,
        } : {}),
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

  // Reserved and damaged qty are edited inline like reorder level, but
  // unlike reorder level they represent real stock movement (into or
  // out of an allocation bucket), so each change is logged just like a
  // Stock Entry would be — keeping the movement history complete.
  async function handleReservedBlur(row, value) {
    const next = Math.max(0, Number(value) || 0)
    const prev = Number(row.reservedQty || 0)
    if (next === prev) return
    try {
      await api.stock.update(row.id, { reservedQty: next, updatedAt: new Date().toISOString() })
      await api.stockMovements.insert({
        product: row.product, warehouse: row.warehouse, type: 'Reserved',
        qty: Math.abs(next - prev), date: new Date().toISOString().slice(0, 10),
        notes: next > prev ? `Reserved qty increased by ${next - prev}` : `Reservation released for ${prev - next}`,
      })
      refresh()
    } catch (err) {
      showToast('Could not update reserved qty: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleDamagedBlur(row, value) {
    const next = Math.max(0, Number(value) || 0)
    const prev = Number(row.damagedQty || 0)
    if (next === prev) return
    try {
      await api.stock.update(row.id, { damagedQty: next, updatedAt: new Date().toISOString() })
      await api.stockMovements.insert({
        product: row.product, warehouse: row.warehouse, type: 'Damaged',
        qty: Math.abs(next - prev), date: new Date().toISOString().slice(0, 10),
        notes: next > prev ? `Marked ${next - prev} more as damaged` : `${prev - next} un-marked as damaged`,
      })
      refresh()
    } catch (err) {
      showToast('Could not update damaged qty: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  // Disposes of the currently-damaged qty entirely — removes it from
  // qtyOnHand (it's leaving the warehouse for good) and clears the
  // damaged bucket back to 0.
  async function handleWriteOffDamaged(row) {
    const damaged = Number(row.damagedQty || 0)
    if (damaged <= 0) return
    if (!confirm(`Write off ${damaged} ${row.unit} of damaged ${row.product} at ${row.warehouse}? This removes it from qty on hand permanently.`)) return
    try {
      const nextQty = Math.max(0, Number(row.qtyOnHand || 0) - damaged)
      await api.stock.update(row.id, { qtyOnHand: nextQty, damagedQty: 0, updatedAt: new Date().toISOString() })
      await api.stockMovements.insert({
        product: row.product, warehouse: row.warehouse, type: 'Write-off',
        qty: damaged, date: new Date().toISOString().slice(0, 10),
        notes: 'Damaged stock written off and removed from qty on hand',
      })
      refresh()
      showToast(`Wrote off ${damaged} ${row.unit} of ${row.product}`)
    } catch (err) {
      showToast('Could not write off damaged stock: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function openTransfer(row) {
    setTransferForm(emptyTransferForm(row))
    setShowTransferModal(true)
  }

  async function handleTransfer(e) {
    e.preventDefault()
    const { product, fromWarehouse, toWarehouse, qty } = transferForm
    const moveQty = Math.abs(Number(qty) || 0)
    if (!toWarehouse || !moveQty) {
      showToast('Destination warehouse and quantity are required', 'error')
      return
    }
    if (toWarehouse === fromWarehouse) {
      showToast('Choose a different destination warehouse', 'error')
      return
    }
    const source = stock.find((s) => s.product === product && s.warehouse === fromWarehouse)
    const sourceAvailable = source ? availableQty(source) : 0
    if (moveQty > sourceAvailable) {
      showToast(`Only ${sourceAvailable} ${source?.unit || ''} available to transfer at ${fromWarehouse}`, 'error')
      return
    }
    setTransferring(true)
    try {
      await api.stock.update(source.id, { qtyOnHand: Math.max(0, Number(source.qtyOnHand) - moveQty), updatedAt: new Date().toISOString() })

      const dest = stock.find((s) => s.product === product && s.warehouse === toWarehouse)
      if (dest) {
        await api.stock.update(dest.id, { qtyOnHand: Number(dest.qtyOnHand) + moveQty, updatedAt: new Date().toISOString() })
      } else {
        // New destination line — carries over the source's batch/expiry
        // metadata for the transferred qty, since this is its first
        // stock at that warehouse.
        await api.stock.insert({
          product, warehouse: toWarehouse, unit: source.unit, qtyOnHand: moveQty, reorderLevel: 0,
          expiryDate: source.expiryDate || null, batchNumber: source.batchNumber || null,
          lotNumber: source.lotNumber || null, manufacturingDate: source.manufacturingDate || null,
          barcode: source.barcode || null, source: 'Manual',
        })
      }

      await api.stockMovements.insert({
        product, warehouse: fromWarehouse, type: 'Transfer Out', qty: moveQty,
        reference: transferForm.reference, date: transferForm.date,
        notes: `To ${toWarehouse}${transferForm.notes ? ' — ' + transferForm.notes : ''}`,
      })
      await api.stockMovements.insert({
        product, warehouse: toWarehouse, type: 'Transfer In', qty: moveQty,
        reference: transferForm.reference, date: transferForm.date,
        notes: `From ${fromWarehouse}${transferForm.notes ? ' — ' + transferForm.notes : ''}`,
      })

      setShowTransferModal(false)
      refresh()
      showToast(`Transferred ${moveQty} ${source.unit} of ${product} to ${toWarehouse}`)
    } catch (err) {
      showToast('Could not complete transfer: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setTransferring(false)
    }
  }

  function openBatchDetails(row) {
    setBatchRow(row)
    setBatchForm({
      batchNumber: row.batchNumber || '', lotNumber: row.lotNumber || '',
      manufacturingDate: row.manufacturingDate || '', expiryDate: row.expiryDate || '',
      barcode: row.barcode || '',
    })
  }

  async function handleSaveBatchDetails(e) {
    e.preventDefault()
    setSavingBatch(true)
    try {
      await api.stock.update(batchRow.id, { ...batchForm, updatedAt: new Date().toISOString() })
      setBatchRow(null)
      setBatchForm(null)
      refresh()
      showToast('Batch details updated')
    } catch (err) {
      showToast('Could not save batch details: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSavingBatch(false)
    }
  }

  // Encodes the stock line's key identifiers into a scannable QR — a
  // warehouse team can scan it to pull up exactly which batch/lot this
  // label belongs to without retyping anything.
  async function handleShowQR(row) {
    setQrRow(row)
    setQrDataUrl('')
    setQrLoading(true)
    try {
      const barcode = row.barcode || generateBarcode()
      if (!row.barcode) await api.stock.update(row.id, { barcode })
      const payload = [
        `Product: ${row.product}`, `Warehouse: ${row.warehouse}`, `Barcode: ${barcode}`,
        row.batchNumber && `Batch: ${row.batchNumber}`, row.lotNumber && `Lot: ${row.lotNumber}`,
        row.manufacturingDate && `Mfg: ${row.manufacturingDate}`, row.expiryDate && `Exp: ${row.expiryDate}`,
      ].filter(Boolean).join('\n')
      const dataUrl = await QRCode.toDataURL(payload, { width: 280, margin: 1, color: { dark: '#0f1e3d', light: '#ffffff' } })
      setQrDataUrl(dataUrl)
      if (!row.barcode) refresh()
    } catch (err) {
      showToast('Could not generate QR code: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setQrLoading(false)
    }
  }

  function handleDownloadQR() {
    if (!qrDataUrl || !qrRow) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `${qrRow.product}-${qrRow.warehouse}-qr.png`.replace(/\s+/g, '-')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
      EXPORT_HEADERS,
      rows.map(exportRow)
    )
  }

  // Soft alternative to Delete: hides discontinued/obsolete stock
  // lines from the active view without dropping their movement
  // history, the way removing them entirely would.
  async function handleBulkArchive(archived) {
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.stock.update(id, { archived })))
      setSelected(new Set())
      refresh()
      showToast(`${count} stock line${count === 1 ? '' : 's'} ${archived ? 'archived' : 'unarchived'}`)
    } catch (err) {
      showToast(`Could not ${archived ? 'archive' : 'unarchive'} selected: ` + (err.message || 'Unknown error'), 'error')
    }
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
              headers={EXPORT_HEADERS}
              rows={filtered.map(exportRow)}
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

      {showExpiryBanner && stats.expiring > 0 && (
        <div style={{ background: 'var(--amber-100, #fef3c7)', color: 'var(--amber-700, #92400e)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconAlertTriangle width={16} height={16} />
            {stats.expiring} batch{stats.expiring === 1 ? '' : 'es'} expired or expiring within {EXPIRY_WARNING_DAYS} days — check the Expiry Date column below.
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowExpiryBanner(false)}>Dismiss</button>
        </div>
      )}

      <div className="stat-grid">
        <StatCard icon={IconLayers} tone="blue" label="SKUs Tracked" value={stats.totalSkus} />
        <StatCard icon={IconClock} tone="amber" label="Low Stock" value={stats.lowStock} />
        <StatCard icon={IconTrash} tone="red" label="Out of Stock" value={stats.outOfStock} />
        <StatCard icon={IconClock} tone="red" label="Expiring / Expired" value={stats.expiring} />
        <StatCard icon={IconAlertTriangle} tone="red" label="Damaged Stock" value={stats.damagedSkus} />
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-500)', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => { setShowArchived(e.target.checked); setSelected(new Set()) }} />
          Show archived
        </label>
      </div>

      {canEdit && (
        <BulkActionsBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onExport={handleBulkExport}
          onDelete={canDelete ? handleBulkDelete : undefined}
        >
          {showArchived ? (
            <button type="button" className="btn btn-ghost-light" onClick={() => handleBulkArchive(false)}>↩️ Unarchive</button>
          ) : (
            <button type="button" className="btn btn-ghost-light" onClick={() => handleBulkArchive(true)}>🗄️ Archive</button>
          )}
        </BulkActionsBar>
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
              <th>Product</th><th>Warehouse</th><th>Qty On Hand</th><th>Available</th><th>Reserved</th><th>Damaged</th><th>Unit</th>
              <th>Reorder Level</th><th>Status</th><th>Expiry Date</th><th>Last Updated</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={12 + (canEdit ? 1 : 0)}>Loading inventory…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={12 + (canEdit ? 1 : 0)}>
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
              const status = stockStatus(s)
              const productExists = products.some((p) => p.name === s.product)
              return (
                <tr key={s.id} style={{ opacity: s.archived ? 0.55 : 1 }}>
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
                    {s.archived && <span className="pill pill-gray" style={{ marginLeft: 6, fontSize: 10.5 }}>Archived</span>}
                  </td>
                  <td>{s.warehouse}</td>
                  <td className="cell-mono">{Number(s.qtyOnHand).toLocaleString('en-IN')}</td>
                  <td className="cell-mono cell-strong">{availableQty(s).toLocaleString('en-IN')}</td>
                  <td className="cell-mono">
                    {canEdit ? (
                      <input
                        type="number" min="0" defaultValue={s.reservedQty || 0}
                        style={{ width: 70 }}
                        onBlur={(e) => handleReservedBlur(s, e.target.value)}
                      />
                    ) : (
                      s.reservedQty || 0
                    )}
                  </td>
                  <td className="cell-mono">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {canEdit ? (
                        <input
                          type="number" min="0" defaultValue={s.damagedQty || 0}
                          style={{ width: 70 }}
                          onBlur={(e) => handleDamagedBlur(s, e.target.value)}
                        />
                      ) : (
                        s.damagedQty || 0
                      )}
                      {canEdit && Number(s.damagedQty) > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleWriteOffDamaged(s)} title="Write off damaged stock (removes from qty on hand)">
                          <IconTrash width={12} height={12} />
                        </button>
                      )}
                    </div>
                  </td>
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
                      {canEdit && Number(s.qtyOnHand) > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => openTransfer(s)} title="Transfer to another warehouse">
                          <IconTransfer width={14} height={14} />
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => openBatchDetails(s)} title="Batch, lot & barcode details">
                        <IconBarcode width={14} height={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleShowQR(s)} title="Generate QR code label">
                        <IconQrCode width={14} height={14} />
                      </button>
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
              <>
                <div className="field-row">
                  <div className="field">
                    <label>Batch Number <span className="cell-muted">(optional)</span></label>
                    <input
                      value={entryForm.batchNumber}
                      onChange={(e) => setEntryForm({ ...entryForm, batchNumber: e.target.value })}
                      placeholder="e.g. B-2026-0605"
                    />
                  </div>
                  <div className="field">
                    <label>Lot Number <span className="cell-muted">(optional)</span></label>
                    <input
                      value={entryForm.lotNumber}
                      onChange={(e) => setEntryForm({ ...entryForm, lotNumber: e.target.value })}
                      placeholder="e.g. RZBC-L118"
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Manufacturing Date <span className="cell-muted">(optional)</span></label>
                    <input
                      type="date" value={entryForm.manufacturingDate}
                      onChange={(e) => setEntryForm({ ...entryForm, manufacturingDate: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Expiry Date <span className="cell-muted">(optional)</span></label>
                    <input
                      type="date" value={entryForm.expiryDate}
                      onChange={(e) => setEntryForm({ ...entryForm, expiryDate: e.target.value })}
                    />
                  </div>
                </div>
              </>
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
                    <td><Pill tone={MOVEMENT_TONE[m.type] || 'teal'}>{m.type}</Pill></td>
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

      {showTransferModal && (
        <Modal
          title={`Transfer stock — ${transferForm.product}`}
          onClose={() => setShowTransferModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleTransfer} disabled={transferring}>{transferring ? 'Transferring…' : 'Transfer'}</button>
            </>
          }
        >
          <form onSubmit={handleTransfer}>
            <div className="field-row">
              <div className="field">
                <label>From</label>
                <input value={transferForm.fromWarehouse} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="field">
                <label>To</label>
                <ComboField
                  options={warehouseNames.filter((w) => w !== transferForm.fromWarehouse)}
                  value={transferForm.toWarehouse}
                  onChange={(v) => setTransferForm({ ...transferForm, toWarehouse: v })}
                  placeholder="Select destination…"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Quantity</label>
                <input
                  type="number" min="0" value={transferForm.qty}
                  onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="field">
                <label>Date</label>
                <input
                  type="date" value={transferForm.date}
                  onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Reference</label>
                <input
                  value={transferForm.reference}
                  onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })}
                  placeholder="e.g. TRF-0012"
                />
              </div>
              <div className="field">
                <label>Notes</label>
                <input
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {batchRow && batchForm && (
        <Modal
          title={`Batch details — ${batchRow.product} (${batchRow.warehouse})`}
          onClose={() => { setBatchRow(null); setBatchForm(null) }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setBatchRow(null); setBatchForm(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveBatchDetails} disabled={savingBatch}>{savingBatch ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <form onSubmit={handleSaveBatchDetails}>
            <div className="field-row">
              <div className="field">
                <label>Batch Number</label>
                <input
                  value={batchForm.batchNumber}
                  onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                  placeholder="e.g. B-2026-0605"
                />
              </div>
              <div className="field">
                <label>Lot Number</label>
                <input
                  value={batchForm.lotNumber}
                  onChange={(e) => setBatchForm({ ...batchForm, lotNumber: e.target.value })}
                  placeholder="e.g. RZBC-L118"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Manufacturing Date</label>
                <input
                  type="date" value={batchForm.manufacturingDate}
                  onChange={(e) => setBatchForm({ ...batchForm, manufacturingDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Expiry Date</label>
                <input
                  type="date" value={batchForm.expiryDate}
                  onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Barcode</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={batchForm.barcode}
                  onChange={(e) => setBatchForm({ ...batchForm, barcode: e.target.value })}
                  placeholder="e.g. 8901234500017"
                />
                <button
                  type="button" className="btn btn-secondary btn-sm"
                  onClick={() => setBatchForm({ ...batchForm, barcode: generateBarcode() })}
                >
                  Generate
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {qrRow && (
        <Modal title={`QR label — ${qrRow.product} (${qrRow.warehouse})`} onClose={() => { setQrRow(null); setQrDataUrl('') }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {qrLoading ? (
              <p className="cell-muted">Generating…</p>
            ) : qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt={`QR code for ${qrRow.product}`} width={220} height={220} style={{ borderRadius: 8, border: '1px solid var(--border, #e2e5eb)' }} />
                <div style={{ fontSize: 12.5, color: 'var(--ink-500)', textAlign: 'center' }}>
                  <div>{qrRow.product} — {qrRow.warehouse}</div>
                  {qrRow.batchNumber && <div>Batch: {qrRow.batchNumber}</div>}
                  {qrRow.barcode && <div>Barcode: {qrRow.barcode}</div>}
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleDownloadQR}>Download PNG</button>
              </>
            ) : (
              <p className="cell-muted">Could not generate a QR code.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
