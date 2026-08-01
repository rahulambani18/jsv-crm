import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { WAREHOUSES, calcOrderTotals, GST_RATE } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconTrash, IconEdit, IconSearch, IconTruck } from '../components/Icons.jsx'
import Dropdown from '../components/Dropdown.jsx'
import ComboField from '../components/ComboField.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import Pagination from '../components/Pagination.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { availableQty } from '../lib/stockStatus.js'
import { exportCSV } from '../lib/exportUtils.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import ClearFiltersButton from '../components/ClearFiltersButton.jsx'
import ShippingDocsModal, { SHIPPING_DOC_FIELDS, docsCollectedCount } from '../components/ShippingDocsModal.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'

const STATUSES = ['All statuses', 'Processing', 'Dispatched', 'Delivered', 'Cancelled']
const PAYMENT_FILTERS = ['All payments', 'Paid', 'Pending']
const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom']
const DOCS_FILTERS = ['All orders', 'Missing documents']
// Shipping documents only apply once an order has actually shipped —
// Processing/Cancelled orders show a plain dash instead of a checklist.
const DOCS_ELIGIBLE_STATUSES = ['Dispatched', 'Delivered']

function termsToDays(terms) {
  if (terms === 'Due on Receipt') return 0
  const match = /Net (\d+)/.exec(terms || '')
  return match ? Number(match[1]) : null
}

function addDays(dateStr, days) {
  if (!dateStr || days == null) return ''
  return new Date(new Date(dateStr).getTime() + days * 86400000).toISOString().slice(0, 10)
}

function emptyLineItem() {
  return { product: '', qty: 1, unit: 'kg', unitPrice: 0 }
}

function emptyForm() {
  return {
    customerId: '', company: '', warehouse: WAREHOUSES[0], orderDate: '', delivery: '',
    paymentTerms: 'Net 30', paymentDueDate: '',
    poNumber: '', poDate: '', dispatchDate: '',
    lineItems: [emptyLineItem()], deliveryCharge: 0, status: 'Processing', payment: 'Pending',
  }
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

const ORDER_COLUMNS = [
  { key: 'poNumber', label: 'PO Number' },
  { key: 'company', label: 'Company' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'orderDate', label: 'Order Date' },
  { key: 'delivery', label: 'Expected Delivery' },
  { key: 'dispatchDate', label: 'Dispatch Date' },
  { key: 'total', label: 'Total (incl. GST)' },
  { key: 'status', label: 'Status' },
  { key: 'payment', label: 'Payment' },
  { key: 'shippingDocs', label: 'Shipping Docs' },
]

export default function Orders() {
  const { can } = useAuth()
  const canEdit = can('orders', 'edit')
  const canDelete = can('orders', 'delete')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [search, setSearch, searchMeta] = usePersistedFilter('jsv_filter_orders_search', searchParams.get('q'), '')
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCols, setVisibleCols] = useState(ORDER_COLUMNS.map((c) => c.key))
  const [warehouseFilter, setWarehouseFilter, warehouseMeta] = usePersistedFilter('jsv_filter_orders_warehouse', undefined, 'All warehouses')
  const [statusFilter, setStatusFilter, statusMeta] = usePersistedFilter('jsv_filter_orders_status', undefined, 'All statuses')
  const [paymentFilter, setPaymentFilter, paymentMeta] = usePersistedFilter('jsv_filter_orders_payment', searchParams.get('payment'), 'All payments')
  const [docsFilter, setDocsFilter, docsMeta] = usePersistedFilter('jsv_filter_orders_docs', undefined, 'All orders')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [users, setUsers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [stock, setStock] = useState([])
  const [shippingDocsOrder, setShippingDocsOrder] = useState(null)

  useEffect(() => { refresh() }, [])
  useEffect(() => { api.users.list().then(setUsers).catch(() => {}) }, [])
  useEffect(() => { Promise.all([api.invoices.list(), api.payments.list()]).then(([inv, pay]) => { setInvoices(inv); setPayments(pay) }).catch(() => {}) }, [])
  useEffect(() => { api.stock.list().then(setStock).catch(() => { /* Inventory not set up yet — stock warnings just won't show */ }) }, [])

  // Location/godown suggestions: the starter list plus any locations
  // already in use across stock and orders — grows on its own as
  // people type new ones, no separate warehouse master to manage.
  const warehouseNames = useMemo(() => {
    const names = new Set(WAREHOUSES)
    stock.forEach((s) => { if (s.warehouse) names.add(s.warehouse) })
    orders.forEach((o) => { if (o.warehouse) names.add(o.warehouse) })
    return [...names]
  }, [stock, orders])

  const WAREHOUSE_FILTERS = useMemo(() => ['All warehouses', ...warehouseNames], [warehouseNames])

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([api.orders.list(), api.customers.list(), api.products.list()]).then(([o, c, p]) => {
      setOrders(o); setCustomers(c); setProducts(p); setLoading(false)
    })
  }

  // Keep the list current in the background without disrupting whatever
  // the user is doing (editing, a bulk selection, a scroll position).
  useAutoRefresh(() => refresh(true), 60000)



  const filtered = useMemo(() => orders.filter((o) => {
    const matchesWarehouse = warehouseFilter === 'All warehouses' || o.warehouse === warehouseFilter
    const matchesStatus = statusFilter === 'All statuses' || o.status === statusFilter
    const matchesPayment = paymentFilter === 'All payments' || o.payment === paymentFilter
    const matchesDocs = docsFilter === 'All orders' ||
      (DOCS_ELIGIBLE_STATUSES.includes(o.status) && docsCollectedCount(o.shippingDocs) < SHIPPING_DOC_FIELDS.length)
    const matchesSearch = !search || [o.orderNo, o.company, o.poNumber].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    return matchesWarehouse && matchesStatus && matchesPayment && matchesDocs && matchesSearch
  }), [orders, warehouseFilter, statusFilter, paymentFilter, docsFilter, search])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [warehouseFilter, statusFilter, paymentFilter, docsFilter, search])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  const totals = useMemo(() => calcOrderTotals(form.lineItems, GST_RATE, form.deliveryCharge), [form.lineItems, form.deliveryCharge])


  const stockByKey = useMemo(() => {
    const map = {}
    // A product/warehouse can now have several batches (batch/lot
    // tracking) — sum their available qty (on hand minus reserved and
    // damaged) rather than letting the last batch overwrite the rest.
    stock.forEach((s) => {
      if (s.archived) return
      const key = `${s.product}|${s.warehouse}`
      map[key] = (map[key] || 0) + availableQty(s)
    })
    return map
  }, [stock])

  const stockShortages = useMemo(() => {
    return form.lineItems
      .map((li) => {
        if (!li.product || !form.warehouse) return null
        const available = stockByKey[`${li.product}|${form.warehouse}`]
        if (available === undefined) return null // not tracked in Inventory — nothing to check
        if (Number(li.qty) > available) return { product: li.product, ordered: Number(li.qty), available }
        return null
      })
      .filter(Boolean)
  }, [form.lineItems, form.warehouse, stockByKey])

  function updateLineItem(index, patch) {
    setForm((f) => {
      const items = [...f.lineItems]
      items[index] = { ...items[index], ...patch }
      // Auto-fill unit price when a known product is picked
      if (patch.product) {
        const prod = products.find((p) => p.name === patch.product)
        if (prod?.unitPrice) items[index].unitPrice = prod.unitPrice
      }
      return { ...f, lineItems: items }
    })
  }

  function addLineItem() {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] }))
  }

  function removeLineItem(index) {
    setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== index) }))
  }

  function handleCustomerChange(customerId) {
    const customer = customers.find((c) => c.id === customerId)
    setForm((f) => ({ ...f, customerId, company: customer?.company || f.company }))
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  function openEdit(order) {
    setEditingId(order.id)
    setForm({ ...emptyForm(), ...order })
    setShowModal(true)
  }

  async function handleDelete(order) {
    if (!confirm(`Delete order "${order.poNumber || order.orderNo}"? This cannot be undone.`)) return
    try {
      await api.orders.remove(order.id)
      refresh()
      showToast(`Order ${order.poNumber || order.orderNo} deleted`)
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
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((o) => o.id))
    )
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} order${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.orders.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} order${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected orders: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((o) => selected.has(o.id))
    exportCSV(
      'Orders',
      ['PO Number', 'Order #', 'Company', 'Warehouse', 'Order Date', 'Expected Delivery', 'Dispatch Date', 'Total', 'Status', 'Payment', 'Shipping Docs'],
      rows.map((o) => [o.poNumber, o.orderNo, o.company, o.warehouse, o.orderDate, o.delivery, o.dispatchDate, `₹${Number(o.total).toLocaleString('en-IN')}`, o.status, o.payment, DOCS_ELIGIBLE_STATUSES.includes(o.status) ? `${docsCollectedCount(o.shippingDocs)}/${SHIPPING_DOC_FIELDS.length}` : '—'])
    )
  }

  async function handleBulkAssign(repName) {
    if (!repName) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.orders.update(id, { assignedTo: repName })))
      setSelected(new Set())
      refresh()
      showToast(`${count} order${count === 1 ? '' : 's'} assigned to ${repName}`)
    } catch (err) {
      showToast('Could not assign: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleBulkStatus(status) {
    if (!status) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.orders.update(id, { status })))
      setSelected(new Set())
      refresh()
      showToast(`Status updated to "${status}" for ${count} order${count === 1 ? '' : 's'}`)
    } catch (err) {
      showToast('Could not update status: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  // Bulk version of the "Generate from order" flow already on the
  // Invoices page — skips orders that already have an invoice
  // (matched by orderId) instead of creating duplicates.
  async function handleBulkGenerateInvoice() {
    const targets = orders.filter((o) => selected.has(o.id) && !invoices.some((i) => i.orderId === o.id))
    const skipped = selected.size - targets.length
    if (targets.length === 0) {
      showToast('Every selected order already has an invoice', 'error')
      return
    }
    if (!confirm(`Generate ${targets.length} invoice${targets.length === 1 ? '' : 's'} from the selected order${targets.length === 1 ? '' : 's'}?${skipped ? ` (${skipped} already invoiced, will be skipped)` : ''}`)) return
    try {
      let n = 0
      for (const order of targets) {
        const subtotal = Number(order.subtotal ?? order.total / 1.18 ?? 0)
        const gst = Number(order.gstAmount ?? subtotal * 0.18)
        await api.invoices.insert({
          invoiceNo: `INV-2026-${String(40 + invoices.length + n + 1).padStart(4, '0')}`,
          company: order.company,
          orderId: order.id,
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate: order.paymentDueDate || addDays(new Date().toISOString().slice(0, 10), 30),
          paymentTerms: order.paymentTerms || 'Net 30',
          subtotal: Math.round(subtotal),
          cgst: Math.round(gst / 2),
          sgst: Math.round(gst / 2),
          igst: 0,
          total: Math.round(subtotal + gst),
          status: 'Draft',
          paymentMode: '',
          notes: `Generated from order ${order.orderNo}`,
        })
        n++
      }
      setSelected(new Set())
      const invs = await api.invoices.list()
      setInvoices(invs)
      showToast(`${n} invoice${n === 1 ? '' : 's'} generated${skipped ? ` (${skipped} skipped — already invoiced)` : ''}`)
    } catch (err) {
      showToast('Could not generate invoices: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  // Inline Status/Payment dropdowns in the table — deliberately available
  // to everyone who can see this page, not just users with full "edit"
  // rights. Editing the rest of an order (products, amounts, dates) still
  // requires the edit permission via the pencil icon; this only ever
  // patches the one field, so it's safe to hand to reps who shouldn't be
  // able to change order contents.
  async function handleQuickUpdate(orderId, field, value) {
    const prev = orders
    setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, [field]: value } : o)))
    try {
      await api.orders.update(orderId, { [field]: value })
    } catch (err) {
      setOrders(prev)
      showToast('Could not update: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleSaveShippingDocs(orderId, shippingDocs) {
    const prev = orders
    setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, shippingDocs } : o)))
    try {
      await api.orders.update(orderId, { shippingDocs })
    } catch (err) {
      setOrders(prev)
      throw err
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const lineItems = form.lineItems
      .filter((li) => li.product && Number(li.qty) > 0)
      .map((li) => ({ ...li, lineTotal: Math.round((Number(li.qty) || 0) * (Number(li.unitPrice) || 0) * 100) / 100 }))
    const { subtotal, gstAmount, deliveryCharge, total } = calcOrderTotals(lineItems, GST_RATE, form.deliveryCharge)
    const record = {
      customerId: form.customerId, company: form.company, warehouse: form.warehouse,
      orderDate: form.orderDate, delivery: form.delivery, lineItems,
      subtotal, gstRate: GST_RATE, gstAmount, deliveryCharge, total,
      status: form.status, payment: form.payment,
      paymentTerms: form.paymentTerms, paymentDueDate: form.paymentDueDate,
      poNumber: form.poNumber, poDate: form.poDate, dispatchDate: form.dispatchDate,
    }
    try {
      if (editingId) {
        await api.orders.update(editingId, record)
        showToast('Order updated successfully')
      } else {
        record.orderNo = `ORD-2026-${String(300 + orders.length + 1).padStart(4, '0')}`
        if (!record.poNumber) record.poNumber = `PO-2026-${String(300 + orders.length + 1).padStart(4, '0')}`
        if (!record.poDate) record.poDate = record.orderDate
        await api.orders.insert(record)
        showToast('Order created successfully')
      }
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      refresh()
    } catch (err) {
      showToast('Could not save: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={orders.length === 0 ? 'No orders yet' : `${orders.length} order${orders.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Orders"
              headers={['PO Number', 'Order #', 'Company', 'Warehouse', 'Order Date', 'Expected Delivery', 'Dispatch Date', 'Total', 'Status', 'Payment', 'Shipping Docs']}
              rows={filtered.map((o) => [o.poNumber, o.orderNo, o.company, o.warehouse, o.orderDate, o.delivery, o.dispatchDate, `₹${Number(o.total).toLocaleString('en-IN')}`, o.status, o.payment, DOCS_ELIGIBLE_STATUSES.includes(o.status) ? `${docsCollectedCount(o.shippingDocs)}/${SHIPPING_DOC_FIELDS.length}` : '—'])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={openCreate}>
                <IconPlus width={15} height={15} /> New Order
              </button>
            )}
          </div>
        }
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, PO #…" />
        </div>
        <select className="select-input" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          {WAREHOUSE_FILTERS.map((w) => <option key={w}>{w}</option>)}
        </select>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select-input" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
          {PAYMENT_FILTERS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="select-input" value={docsFilter} onChange={(e) => setDocsFilter(e.target.value)}>
          {DOCS_FILTERS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <ColumnChooser columns={ORDER_COLUMNS} storageKey="jsv_cols_orders" onChange={setVisibleCols} />
        <ClearFiltersButton
          filters={[searchMeta, warehouseMeta, statusMeta, paymentMeta, docsMeta]}
          onClear={() => { searchMeta.clear(); warehouseMeta.clear(); statusMeta.clear(); paymentMeta.clear(); docsMeta.clear() }}
        />
      </div>

      {canEdit && (
        <BulkActionsBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onExport={handleBulkExport}
          onDelete={canDelete ? handleBulkDelete : undefined}
        >
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkAssign(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Assign to…</option>
            {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkStatus(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Change status…</option>
            <option value="Processing">Processing</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button type="button" className="btn btn-ghost-light" onClick={handleBulkGenerateInvoice}>
            🧾 Generate Invoice
          </button>
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
                <th key={key}>{ORDER_COLUMNS.find((c) => c.key === key)?.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={visibleCols.length + (canEdit ? 1 : 0) + 1} rows={6} />
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + (canEdit ? 1 : 0) + 1}>
                {orders.length === 0 ? (
                  <EmptyState
                    icon="🛒"
                    title="No orders yet"
                    subtitle="Create your first order to start tracking dispatch and payment."
                    actionLabel={canEdit ? 'New Order' : undefined}
                    onAction={canEdit ? openCreate : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No orders match your filters" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : paged.map((o) => {
              const cell = (key) => {
                switch (key) {
                  case 'poNumber': return (
                    <td key={key} className="cell-mono">
                      {o.poNumber || <span className="cell-muted">—</span>}
                      <br /><span className="cell-mono cell-muted" style={{ fontSize: 11 }}>{o.orderNo}</span>
                    </td>
                  )
                  case 'company': return <td key={key} className="cell-strong">{o.company}</td>
                  case 'warehouse': return <td key={key}>{o.warehouse}</td>
                  case 'orderDate': return <td key={key} className="cell-mono">{o.orderDate}</td>
                  case 'delivery': return <td key={key} className="cell-mono">{o.delivery}</td>
                  case 'dispatchDate': return <td key={key} className="cell-mono">{o.dispatchDate || <span className="cell-muted">—</span>}</td>
                  case 'total': return (
                    <td key={key} className="cell-mono cell-strong">
                      {formatINR(o.total)}
                      <br /><span className="cell-mono cell-muted" style={{ fontSize: 11, fontWeight: 400 }}>
                        {formatINR(o.subtotal)}{Number(o.deliveryCharge) > 0 ? ` + delivery ${formatINR(o.deliveryCharge)}` : ''} + GST {formatINR(o.gstAmount)} ({o.gstRate || 18}%)
                      </span>
                    </td>
                  )
                  case 'status': return (
                    <td key={key}>
                      <select
                        className={`pill-select pill-${{ Processing: 'navy', Dispatched: 'amber', Delivered: 'teal', Cancelled: 'red' }[o.status] || 'gray'}`}
                        value={o.status}
                        onChange={(e) => handleQuickUpdate(o.id, 'status', e.target.value)}
                      >
                        <option>Processing</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option>
                      </select>
                    </td>
                  )
                  case 'payment': return (
                    <td key={key}>
                      <select
                        className={`pill-select pill-${{ Pending: 'amber', Partial: 'amber', Paid: 'teal' }[o.payment] || 'gray'}`}
                        value={o.payment}
                        onChange={(e) => handleQuickUpdate(o.id, 'payment', e.target.value)}
                      >
                        <option>Pending</option><option>Partial</option><option>Paid</option>
                      </select>
                    </td>
                  )
                  case 'shippingDocs': return (
                    <td key={key}>
                      {DOCS_ELIGIBLE_STATUSES.includes(o.status) ? (
                        (() => {
                          const count = docsCollectedCount(o.shippingDocs)
                          const complete = count === SHIPPING_DOC_FIELDS.length
                          return (
                            <button
                              type="button"
                              className={`pill pill-${complete ? 'teal' : 'amber'}`}
                              style={{ border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                              onClick={() => setShippingDocsOrder(o)}
                              title="View / update shipping documents"
                            >
                              {complete ? '✓ All docs' : `⚠ ${count}/${SHIPPING_DOC_FIELDS.length} docs`}
                            </button>
                          )
                        })()
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                  )
                  default: return null
                }
              }
              return (
              <tr key={o.id}>
                {canEdit && (
                  <td className="row-checkbox-cell">
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelected(o.id)} />
                  </td>
                )}
                {visibleCols.map((key) => cell(key))}
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Track / create shipment for this order"
                      onClick={() => navigate(`/logistics?order=${encodeURIComponent(o.orderNo)}&q=${encodeURIComponent(o.orderNo)}`)}
                    >
                      <IconTruck width={13} height={13} />
                    </button>
                    {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(o)}><IconEdit width={13} height={13} /></button>}
                    {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(o)}><IconTrash width={13} height={13} /></button>}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />

      {showModal && (
        <Modal
          title={editingId ? 'Edit Order' : 'New Order'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="order-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save order'}
              </button>
            </>
          }
        >
          <form id="order-form" onSubmit={handleSave}>
            <div className="field-row">
              <div className="field">
                <label>Customer</label>
                <select required value={form.customerId} onChange={(e) => handleCustomerChange(e.target.value)}>
                  <option value="" disabled>Select customer…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Company name</label>
                <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Auto-fills from customer" />
              </div>
            </div>
            {stockShortages.length > 0 && (
              <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', border: '1px solid var(--red-600)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 12.5, marginBottom: 14, fontWeight: 600 }}>
                ⚠️ Not enough stock at {form.warehouse}: {stockShortages.map((s) => `${s.product} (ordering ${s.ordered}, only ${s.available} on hand)`).join('; ')}
              </div>
            )}
            <div className="field">
              <label>Dispatch Location</label>
              <ComboField
                options={warehouseNames}
                value={form.warehouse}
                onChange={(v) => setForm({ ...form, warehouse: v })}
                placeholder="Select location…"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Order date</label>
                <input
                  type="date" value={form.orderDate}
                  onChange={(e) => {
                    const orderDate = e.target.value
                    const days = termsToDays(form.paymentTerms)
                    setForm((f) => ({ ...f, orderDate, paymentDueDate: days != null ? addDays(orderDate, days) : f.paymentDueDate }))
                  }}
                />
              </div>
              <div className="field">
                <label>Expected delivery</label>
                <input type="date" value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Payment terms</label>
                <Dropdown
                  options={PAYMENT_TERMS}
                  value={form.paymentTerms}
                  onChange={(paymentTerms) => {
                    const days = termsToDays(paymentTerms)
                    setForm((f) => ({ ...f, paymentTerms, paymentDueDate: days != null ? addDays(f.orderDate, days) : f.paymentDueDate }))
                  }}
                />
              </div>
              <div className="field">
                <label>Payment due date {form.paymentTerms !== 'Custom' && <span style={{ fontWeight: 400, color: 'var(--ink-400)', fontSize: 11 }}>(auto)</span>}</label>
                <input type="date" value={form.paymentDueDate} onChange={(e) => setForm({ ...form, paymentDueDate: e.target.value })} />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Purchase order number</label>
                <input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="Leave blank to auto-generate" />
              </div>
              <div className="field">
                <label>PO date</label>
                <input type="date" value={form.poDate} onChange={(e) => setForm({ ...form, poDate: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Dispatch date</label>
              <input type="date" value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} />
            </div>

            <div className="field">
              <label>Line items</label>
              <div style={{ border: '1px solid var(--paper-200)', borderRadius: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: 480, fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--paper-0)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 8px', fontWeight: 600, fontSize: 11 }}>Product</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 64 }}>Qty</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 64 }}>Unit</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 90 }}>Unit Price</th>
                      <th style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 600, fontSize: 11, width: 90 }}>Total</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineItems.map((li, i) => {
                      const available = li.product && form.warehouse ? stockByKey[`${li.product}|${form.warehouse}`] : undefined
                      const short = available !== undefined && Number(li.qty) > available
                      return (
                      <tr key={i} style={{ borderTop: '1px solid var(--paper-100)' }}>
                        <td style={{ padding: 6 }}>
                          <select value={li.product} onChange={(e) => updateLineItem(i, { product: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="">Select product…</option>
                            {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 6 }}>
                          <input
                            type="number" min="0" value={li.qty}
                            onChange={(e) => updateLineItem(i, { qty: e.target.value })}
                            style={{ width: '100%', fontSize: 12.5, padding: '6px 8px', borderColor: short ? 'var(--red-600)' : undefined }}
                          />
                          {short && <div style={{ color: 'var(--red-600)', fontSize: 10.5, marginTop: 2 }}>only {available} in stock</div>}
                        </td>
                        <td style={{ padding: 6 }}>
                          <select value={li.unit} onChange={(e) => updateLineItem(i, { unit: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="MT">MT</option>
                            <option value="L">L</option>
                          </select>
                        </td>
                        <td style={{ padding: 6 }}>
                          <input type="number" min="0" value={li.unitPrice} onChange={(e) => updateLineItem(i, { unitPrice: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }} />
                        </td>
                        <td className="cell-mono" style={{ padding: '6px 8px', textAlign: 'right' }}>
                          {formatINR((Number(li.qty) || 0) * (Number(li.unitPrice) || 0))}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLineItem(i)} disabled={form.lineItems.length === 1}>
                            <IconTrash width={13} height={13} />
                          </button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem} style={{ marginTop: 8 }}>
                <IconPlus width={13} height={13} /> Add line item
              </button>
            </div>

            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--paper-0)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>Subtotal</span>
                <span className="cell-mono">{formatINR(totals.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>Delivery charges</span>
                <input
                  type="number" min="0" value={form.deliveryCharge}
                  onChange={(e) => setForm({ ...form, deliveryCharge: e.target.value })}
                  style={{ width: 110, textAlign: 'right', fontSize: 12.5, padding: '4px 8px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>GST (18%) on subtotal + delivery</span>
                <span className="cell-mono">{formatINR(totals.gstAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14.5, paddingTop: 6, borderTop: '1px solid var(--paper-200)' }}>
                <span>Total (incl. GST + delivery)</span>
                <span className="cell-mono">{formatINR(totals.total)}</span>
              </div>
            </div>

            <div className="field-row" style={{ marginTop: 14 }}>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Processing</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option>
                </select>
              </div>
              <div className="field">
                <label>Payment</label>
                <select value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })}>
                  <option>Pending</option><option>Partial</option><option>Paid</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {shippingDocsOrder && (
        <ShippingDocsModal
          order={shippingDocsOrder}
          onClose={() => setShippingDocsOrder(null)}
          onSave={(docs) => handleSaveShippingDocs(shippingDocsOrder.id, docs)}
        />
      )}
    </div>
  )
}
