import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus } from '../components/Icons.jsx'
import '../styles/components.css'

const WAREHOUSES = ['All warehouses', 'Mumbai – Bhiwandi', 'Delhi – Bhiwadi', 'Chennai – Sriperumbudur']
const STATUSES = ['All statuses', 'Processing', 'Dispatched', 'Delivered', 'Cancelled']

function emptyForm() {
  return { company: '', warehouse: 'Mumbai – Bhiwandi', orderDate: '', delivery: '', total: '', status: 'Processing', payment: 'Pending' }
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [warehouseFilter, setWarehouseFilter] = useState('All warehouses')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    api.orders.list().then((data) => { setOrders(data); setLoading(false) })
  }

  const filtered = useMemo(() => orders.filter((o) => {
    const matchesWarehouse = warehouseFilter === 'All warehouses' || o.warehouse === warehouseFilter
    const matchesStatus = statusFilter === 'All statuses' || o.status === statusFilter
    return matchesWarehouse && matchesStatus
  }), [orders, warehouseFilter, statusFilter])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const record = {
      ...form,
      total: Number(form.total) || 0,
      orderNo: `ORD-2026-${String(300 + orders.length + 1).padStart(4, '0')}`,
    }
    await api.orders.insert(record)
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm())
    refresh()
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'}`}
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <IconPlus width={15} height={15} /> New Order
          </button>
        }
      />

      <div className="filters-bar">
        <select className="select-input" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
          {WAREHOUSES.map((w) => <option key={w}>{w}</option>)}
        </select>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Order #</th><th>Company</th><th>Warehouse</th><th>Order Date</th><th>Delivery</th><th>Total</th><th>Status</th><th>Payment</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={8}>Loading orders…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={8}>{orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}</td></tr>
            ) : filtered.map((o) => (
              <tr key={o.id}>
                <td className="cell-mono">{o.orderNo}</td>
                <td className="cell-strong">{o.company}</td>
                <td>{o.warehouse}</td>
                <td className="cell-mono">{o.orderDate}</td>
                <td className="cell-mono">{o.delivery}</td>
                <td className="cell-mono">₹{Number(o.total).toLocaleString('en-IN')}</td>
                <td><Pill>{o.status}</Pill></td>
                <td><Pill>{o.payment}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title="New Order"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="order-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save order'}
              </button>
            </>
          }
        >
          <form id="order-form" onSubmit={handleCreate}>
            <div className="field">
              <label>Company</label>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="field">
              <label>Warehouse</label>
              <select value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
                {WAREHOUSES.slice(1).map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Order date</label>
                <input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
              </div>
              <div className="field">
                <label>Delivery date</label>
                <input type="date" value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Total (₹)</label>
                <input type="number" min="0" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Processing</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Payment</label>
              <select value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })}>
                <option>Pending</option><option>Partial</option><option>Paid</option>
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
