import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { WAREHOUSES, calcOrderTotals, GST_RATE } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconTrash, IconEdit, IconSearch } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import '../styles/components.css'

const WAREHOUSE_FILTERS = ['All warehouses', ...WAREHOUSES]
const STATUSES = ['All statuses', 'Processing', 'Dispatched', 'Delivered', 'Cancelled']
const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom']

function termsToDays(terms) {
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
    poNumber: '', poDate: '', vehicle: '', lrNumber: '', transporter: '', dispatchDate: '',
    lineItems: [emptyLineItem()], status: 'Processing', payment: 'Pending',
  }
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export default function Orders() {
  const { can } = useAuth()
  const canEdit = can('orders', 'edit')
  const canDelete = can('orders', 'delete')
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [warehouseFilter, setWarehouseFilter] = useState('All warehouses')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.orders.list(), api.customers.list(), api.products.list()]).then(([o, c, p]) => {
      setOrders(o); setCustomers(c); setProducts(p); setLoading(false)
    })
  }

  const filtered = useMemo(() => orders.filter((o) => {
    const matchesWarehouse = warehouseFilter === 'All warehouses' || o.warehouse === warehouseFilter
    const matchesStatus = statusFilter === 'All statuses' || o.status === statusFilter
    const matchesSearch = !search || [o.orderNo, o.company, o.poNumber, o.vehicle, o.lrNumber, o.transporter].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    return matchesWarehouse && matchesStatus && matchesSearch
  }), [orders, warehouseFilter, statusFilter, search])

  const totals = useMemo(() => calcOrderTotals(form.lineItems), [form.lineItems])

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
    if (!confirm(`Delete order "${order.orderNo}"? This cannot be undone.`)) return
    try {
      await api.orders.remove(order.id)
      refresh()
    } catch (err) {
      alert('Could not delete: ' + (err.message || 'Unknown error'))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const lineItems = form.lineItems
      .filter((li) => li.product && Number(li.qty) > 0)
      .map((li) => ({ ...li, lineTotal: Math.round((Number(li.qty) || 0) * (Number(li.unitPrice) || 0) * 100) / 100 }))
    const { subtotal, gstAmount, total } = calcOrderTotals(lineItems)
    const record = {
      customerId: form.customerId, company: form.company, warehouse: form.warehouse,
      orderDate: form.orderDate, delivery: form.delivery, lineItems,
      subtotal, gstRate: GST_RATE, gstAmount, total,
      status: form.status, payment: form.payment,
      paymentTerms: form.paymentTerms, paymentDueDate: form.paymentDueDate,
      poNumber: form.poNumber, poDate: form.poDate, vehicle: form.vehicle,
      lrNumber: form.lrNumber, transporter: form.transporter, dispatchDate: form.dispatchDate,
    }
    try {
      if (editingId) {
        await api.orders.update(editingId, record)
      } else {
        record.orderNo = `ORD-2026-${String(300 + orders.length + 1).padStart(4, '0')}`
        await api.orders.insert(record)
      }
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      refresh()
    } catch (err) {
      alert('Could not save: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Orders"
              headers={['Order #', 'PO Number', 'Company', 'Warehouse', 'Order Date', 'Expected Delivery', 'Vehicle', 'LR Number', 'Transporter', 'Dispatch Date', 'Total', 'Status', 'Payment']}
              rows={filtered.map((o) => [o.orderNo, o.poNumber, o.company, o.warehouse, o.orderDate, o.delivery, o.vehicle, o.lrNumber, o.transporter, o.dispatchDate, `₹${Number(o.total).toLocaleString('en-IN')}`, o.status, o.payment])}
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, PO #, vehicle, LR #…" />
        </div>
        <select className="select-input" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          {WAREHOUSE_FILTERS.map((w) => <option key={w}>{w}</option>)}
        </select>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Order #</th><th>PO Number</th><th>Company</th><th>Warehouse</th><th>Order Date</th><th>Expected Delivery</th><th>Logistics</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th><th>Payment</th>{(canEdit || canDelete) && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={(canEdit || canDelete) ? 13 : 12}>Loading orders…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={(canEdit || canDelete) ? 13 : 12}>{orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}</td></tr>
            ) : filtered.map((o) => (
              <tr key={o.id}>
                <td className="cell-mono">{o.orderNo}</td>
                <td className="cell-mono">{o.poNumber || '—'}</td>
                <td className="cell-strong">{o.company}</td>
                <td>{o.warehouse}</td>
                <td className="cell-mono">{o.orderDate}</td>
                <td className="cell-mono">{o.delivery}</td>
                <td style={{ fontSize: 11.5 }}>
                  {o.vehicle && <div>🚛 {o.vehicle}</div>}
                  {o.lrNumber && <div className="cell-mono">LR: {o.lrNumber}</div>}
                  {o.transporter && <div className="cell-muted">{o.transporter}</div>}
                  {!o.vehicle && !o.lrNumber && !o.transporter && <span className="cell-muted">—</span>}
                </td>
                <td className="cell-mono">{formatINR(o.subtotal)}</td>
                <td className="cell-mono cell-muted">{formatINR(o.gstAmount)} ({o.gstRate || 18}%)</td>
                <td className="cell-mono cell-strong">{formatINR(o.total)}</td>
                <td><Pill>{o.status}</Pill></td>
                <td><Pill>{o.payment}</Pill></td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(o)}><IconEdit width={13} height={13} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(o)}><IconTrash width={13} height={13} /></button>}
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
            <div className="field">
              <label>Warehouse</label>
              <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
                {WAREHOUSES.map((w) => <option key={w}>{w}</option>)}
              </select>
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
                <select
                  value={form.paymentTerms}
                  onChange={(e) => {
                    const paymentTerms = e.target.value
                    const days = termsToDays(paymentTerms)
                    setForm((f) => ({ ...f, paymentTerms, paymentDueDate: days != null ? addDays(f.orderDate, days) : f.paymentDueDate }))
                  }}
                >
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Payment due date {form.paymentTerms !== 'Custom' && <span style={{ fontWeight: 400, color: 'var(--ink-400)', fontSize: 11 }}>(auto)</span>}</label>
                <input type="date" value={form.paymentDueDate} onChange={(e) => setForm({ ...form, paymentDueDate: e.target.value })} />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Purchase order number</label>
                <input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="Customer's PO #" />
              </div>
              <div className="field">
                <label>PO date</label>
                <input type="date" value={form.poDate} onChange={(e) => setForm({ ...form, poDate: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Vehicle number</label>
                <input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="e.g. MH04 AB 1234" />
              </div>
              <div className="field">
                <label>LR number</label>
                <input value={form.lrNumber} onChange={(e) => setForm({ ...form, lrNumber: e.target.value })} placeholder="Lorry receipt #" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Transporter</label>
                <input value={form.transporter} onChange={(e) => setForm({ ...form, transporter: e.target.value })} placeholder="e.g. Professional Courier" />
              </div>
              <div className="field">
                <label>Dispatch date</label>
                <input type="date" value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} />
              </div>
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
                    {form.lineItems.map((li, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--paper-100)' }}>
                        <td style={{ padding: 6 }}>
                          <select value={li.product} onChange={(e) => updateLineItem(i, { product: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="">Select product…</option>
                            {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 6 }}>
                          <input type="number" min="0" value={li.qty} onChange={(e) => updateLineItem(i, { qty: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }} />
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
                    ))}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>GST (18%)</span>
                <span className="cell-mono">{formatINR(totals.gstAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14.5, paddingTop: 6, borderTop: '1px solid var(--paper-200)' }}>
                <span>Total (incl. GST)</span>
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
    </div>
  )
}
