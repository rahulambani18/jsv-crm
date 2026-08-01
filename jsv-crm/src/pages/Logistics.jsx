import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ExportBar from '../components/ExportBar.jsx'
import EmptyState from '../components/EmptyState.jsx'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import ClearFiltersButton from '../components/ClearFiltersButton.jsx'
import { IconPlus, IconSearch, IconEdit, IconTrash, IconTruck, IconRupee, IconChevronRight } from '../components/Icons.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'
import { showToast } from '../lib/toast.js'
import '../styles/components.css'

const TABS = ['Shipments', 'Transporters']

const TRANSPORT_MODES = ['Road', 'Rail', 'Air', 'Ship']
const SHIPMENT_STATUSES = ['Pending', 'Dispatched', 'In Transit', 'Delivered', 'Delayed', 'Cancelled']
const FREIGHT_PAID_BY = ['Us (Prepaid)', 'Customer (To Pay)', 'Third-party']
const FREIGHT_PAYMENT_STATUSES = ['Unpaid', 'Partial', 'Paid']

const STATUS_TONE = {
  Pending: 'gray', Dispatched: 'navy', 'In Transit': 'amber',
  Delivered: 'teal', Delayed: 'red', Cancelled: 'gray',
}
const FREIGHT_STATUS_TONE = { Unpaid: 'red', Partial: 'amber', Paid: 'teal' }

const SHIPMENT_COLUMNS = [
  { key: 'shipmentNo', label: 'Shipment' },
  { key: 'company', label: 'Customer' },
  { key: 'orderNo', label: 'Order' },
  { key: 'invoiceNo', label: 'Invoice' },
  { key: 'route', label: 'Route' },
  { key: 'transporter', label: 'Transporter' },
  { key: 'vehicleNo', label: 'Vehicle No.' },
  { key: 'mode', label: 'Mode' },
  { key: 'dispatchDate', label: 'Dispatch' },
  { key: 'expectedDelivery', label: 'Expected' },
  { key: 'status', label: 'Status' },
  { key: 'freightCost', label: 'Freight' },
  { key: 'freightStatus', label: 'Freight Status' },
]

function formatINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

function emptyForm() {
  return {
    orderNo: '', invoiceNo: '', company: '', origin: '', destination: '', transporter: '',
    vehicleNo: '', driverName: '', driverPhone: '', mode: 'Road',
    lrNumber: '', dispatchDate: new Date().toISOString().slice(0, 10), expectedDelivery: '', actualDelivery: '',
    status: 'Pending', distanceKm: '', freightCost: '', freightPaidBy: 'Us (Prepaid)',
    freightPaymentStatus: 'Unpaid', amountPaid: '', ewayBillNo: '', notes: '',
  }
}

export default function Logistics() {
  const { can } = useAuth()
  const canEdit = can('logistics', 'edit')
  const canDelete = can('logistics', 'delete')

  const [shipments, setShipments] = useState([])
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [tab, setTab, tabMeta] = usePersistedFilter('jsv_filter_logistics_tab', undefined, 'Shipments')
  const [visibleCols, setVisibleCols] = useState(SHIPMENT_COLUMNS.map((c) => c.key))
  const [search, setSearch, searchMeta] = usePersistedFilter('jsv_filter_logistics_search', searchParams.get('q'), '')
  const [statusFilter, setStatusFilter, statusMeta] = usePersistedFilter('jsv_filter_logistics_status', undefined, 'All statuses')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const [payTransporter, setPayTransporter] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => { refresh() }, [])
  useAutoRefresh(() => refresh(true), 60000)

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([api.shipments.list(), api.customers.list(), api.orders.list(), api.invoices.list()]).then(([s, c, o, inv]) => {
      setShipments(s); setCustomers(c); setOrders(o); setInvoices(inv); setLoading(false)
    })
  }

  const companyOptions = useMemo(() => customers.map((c) => c.company), [customers])
  const orderNoOptions = useMemo(() => orders.map((o) => o.orderNo), [orders])
  const invoiceNoOptions = useMemo(() => invoices.map((i) => i.invoiceNo), [invoices])
  const transporterOptions = useMemo(
    () => [...new Set(shipments.map((s) => s.transporter).filter(Boolean))],
    [shipments]
  )

  const filtered = useMemo(() => shipments.filter((s) => {
    const matchStatus = statusFilter === 'All statuses' || s.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [s.shipmentNo, s.company, s.transporter, s.vehicleNo, s.lrNumber, s.orderNo, s.invoiceNo, s.origin, s.destination]
      .some((v) => (v || '').toLowerCase().includes(q))
    return matchStatus && matchSearch
  }), [shipments, search, statusFilter])

  const stats = useMemo(() => {
    const inTransit = shipments.filter((s) => s.status === 'In Transit').length
    const delivered = shipments.filter((s) => s.status === 'Delivered').length
    const delayed = shipments.filter((s) => s.status === 'Delayed' || s.status === 'Pending').length
    const payable = shipments
      .filter((s) => s.freightPaidBy === 'Us (Prepaid)')
      .reduce((sum, s) => sum + (Number(s.freightCost || 0) - Number(s.amountPaid || 0)), 0)
    return { total: shipments.length, inTransit, delivered, delayed, payable }
  }, [shipments])

  // Ledger: one row per transporter, aggregating what we owe them for
  // "Us (Prepaid)" trips only — "Customer (To Pay)"/"Third-party" freight
  // isn't money the business owes, so it's excluded from the payable total.
  const ledger = useMemo(() => {
    const byTransporter = {}
    shipments.forEach((s) => {
      if (!s.transporter) return
      if (!byTransporter[s.transporter]) {
        byTransporter[s.transporter] = { transporter: s.transporter, trips: 0, totalFreight: 0, totalPaid: 0 }
      }
      const row = byTransporter[s.transporter]
      row.trips += 1
      if (s.freightPaidBy === 'Us (Prepaid)') {
        row.totalFreight += Number(s.freightCost || 0)
        row.totalPaid += Number(s.amountPaid || 0)
      }
    })
    return Object.values(byTransporter)
      .map((r) => ({ ...r, due: r.totalFreight - r.totalPaid }))
      .sort((a, b) => b.due - a.due)
  }, [shipments])

  function applyOrderLink(orderNo, base) {
    const order = orders.find((o) => o.orderNo === orderNo)
    if (!order) return { ...base, orderNo }
    const customer = customers.find((c) => c.id === order.customerId)
    return {
      ...base,
      orderNo,
      company: base.company || order.company || '',
      origin: base.origin || order.warehouse || '',
      destination: base.destination || [customer?.city, customer?.state].filter(Boolean).join(', '),
    }
  }

  function applyInvoiceLink(invoiceNo, base) {
    const invoice = invoices.find((i) => i.invoiceNo === invoiceNo)
    if (!invoice) return { ...base, invoiceNo }
    const order = orders.find((o) => o.id === invoice.orderId)
    return {
      ...base,
      invoiceNo,
      company: base.company || invoice.company || '',
      orderNo: base.orderNo || order?.orderNo || '',
    }
  }

  function openCreate() {
    setEditingId(null)
    let base = emptyForm()
    const linkedOrder = searchParams.get('order')
    const linkedInvoice = searchParams.get('invoice')
    if (linkedOrder) base = applyOrderLink(linkedOrder, base)
    if (linkedInvoice) base = applyInvoiceLink(linkedInvoice, base)
    setForm(base)
    setShowModal(true)
  }

  function openEdit(s) {
    setEditingId(s.id)
    setForm({
      orderNo: s.orderNo || '', invoiceNo: s.invoiceNo || '', company: s.company || '', origin: s.origin || '', destination: s.destination || '',
      transporter: s.transporter || '', vehicleNo: s.vehicleNo || '', driverName: s.driverName || '', driverPhone: s.driverPhone || '',
      mode: s.mode || 'Road', lrNumber: s.lrNumber || '', dispatchDate: s.dispatchDate || '', expectedDelivery: s.expectedDelivery || '',
      actualDelivery: s.actualDelivery || '', status: s.status || 'Pending', distanceKm: s.distanceKm ?? '', freightCost: s.freightCost ?? '',
      freightPaidBy: s.freightPaidBy || 'Us (Prepaid)', freightPaymentStatus: s.freightPaymentStatus || 'Unpaid',
      amountPaid: s.amountPaid ?? '', ewayBillNo: s.ewayBillNo || '', notes: s.notes || '',
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const record = {
      ...form,
      distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
      freightCost: form.freightCost ? Number(form.freightCost) : 0,
      amountPaid: form.amountPaid ? Number(form.amountPaid) : 0,
    }
    if (record.freightPaidBy !== 'Us (Prepaid)') {
      // Freight payable tracking only applies to trips we pay for.
      record.freightPaymentStatus = 'Paid'
    }
    try {
      if (editingId) {
        await api.shipments.update(editingId, record)
        showToast(`Shipment ${form.shipmentNo || ''} updated`.trim())
      } else {
        record.shipmentNo = `SHP-2026-${String(40 + shipments.length + 1).padStart(4, '0')}`
        await api.shipments.insert(record)
        showToast(`Shipment ${record.shipmentNo} created`)
      }
      setShowModal(false); setEditingId(null); refresh()
    } catch (err) {
      showToast('Could not save shipment: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s) {
    if (!window.confirm(`Delete shipment "${s.shipmentNo}"?`)) return
    try {
      await api.shipments.remove(s.id)
      showToast(`Shipment ${s.shipmentNo} deleted`)
      refresh()
    } catch (err) {
      showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function openPay(row) {
    setPayTransporter(row)
    setPayAmount(row.due > 0 ? String(row.due) : '')
  }

  // Applies a freight payment against a transporter's oldest unpaid/partial
  // "Us (Prepaid)" shipments first, until the amount is used up.
  async function handleRecordPayment(e) {
    e.preventDefault()
    const amount = Number(payAmount)
    if (!amount || amount <= 0) return
    setPaying(true)
    try {
      let remaining = amount
      const candidates = shipments
        .filter((s) => s.transporter === payTransporter.transporter && s.freightPaidBy === 'Us (Prepaid)' && s.freightPaymentStatus !== 'Paid')
        .sort((a, b) => (a.dispatchDate || '').localeCompare(b.dispatchDate || ''))

      for (const s of candidates) {
        if (remaining <= 0) break
        const due = Number(s.freightCost || 0) - Number(s.amountPaid || 0)
        if (due <= 0) continue
        const applied = Math.min(due, remaining)
        const newPaid = Number(s.amountPaid || 0) + applied
        const newStatus = newPaid >= Number(s.freightCost || 0) ? 'Paid' : 'Partial'
        await api.shipments.update(s.id, { amountPaid: newPaid, freightPaymentStatus: newStatus })
        remaining -= applied
      }
      showToast(`Payment of ${formatINR(amount)} recorded for ${payTransporter.transporter}`)
      setPayTransporter(null); setPayAmount(''); refresh()
    } catch (err) {
      showToast('Could not record payment: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Logistics"
        subtitle={
          shipments.length === 0
            ? 'No shipments yet'
            : `${shipments.length} shipment${shipments.length === 1 ? '' : 's'} — tracking, transporters and freight`
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            {tab === 'Shipments' && (
              <ExportBar
                title="Shipments"
                headers={['Shipment', 'Order', 'Invoice', 'Customer', 'Origin', 'Destination', 'Transporter', 'Vehicle No.', 'Mode', 'LR No.', 'Dispatch', 'Expected', 'Actual', 'Status', 'Freight Cost', 'Freight Paid By', 'Freight Status']}
                rows={filtered.map((s) => [s.shipmentNo, s.orderNo, s.invoiceNo, s.company, s.origin, s.destination, s.transporter, s.vehicleNo, s.mode, s.lrNumber, s.dispatchDate, s.expectedDelivery, s.actualDelivery, s.status, s.freightCost, s.freightPaidBy, s.freightPaymentStatus])}
                count={filtered.length}
              />
            )}
            {canEdit && tab === 'Shipments' && (
              <button className="btn btn-primary" onClick={openCreate}>
                <IconPlus width={15} height={15} /> Add Shipment
              </button>
            )}
          </div>
        }
      />

      <div className="tabs-bar">
        {TABS.map((t) => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t} <span className="count">{t === 'Shipments' ? shipments.length : ledger.length}</span>
          </button>
        ))}
      </div>

      {tab === 'Shipments' && (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <StatCard icon={IconTruck} tone="blue" label="Total Shipments" value={stats.total} mono />
            <StatCard icon={IconTruck} tone="amber" label="In Transit" value={stats.inTransit} mono onClick={() => setStatusFilter('In Transit')} />
            <StatCard icon={IconTruck} tone="teal" label="Delivered" value={stats.delivered} mono onClick={() => setStatusFilter('Delivered')} />
            <StatCard icon={IconRupee} tone="red" label="Freight Payable" value={formatINR(stats.payable)} mono />
          </div>

          <div className="filters-bar">
            <div className="search-input">
              <IconSearch width={15} height={15} />
              <input placeholder="Search shipment, customer, transporter, vehicle, LR no…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All statuses</option>
              {SHIPMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <ColumnChooser columns={SHIPMENT_COLUMNS} storageKey="jsv_cols_logistics" onChange={setVisibleCols} />
            <ClearFiltersButton filters={[searchMeta, statusMeta]} onClear={() => { searchMeta.clear(); statusMeta.clear() }} />
          </div>

          <div className="table-wrap sticky-first-col">
            <table className="data-table">
              <thead>
                <tr>{visibleCols.map((key) => (
                  <th key={key}>{SHIPMENT_COLUMNS.find((c) => c.key === key)?.label}</th>
                ))}{(canEdit || canDelete) && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton cols={visibleCols.length + ((canEdit || canDelete) ? 1 : 0)} rows={6} />
                ) : filtered.length === 0 ? (
                  <tr className="empty-row"><td colSpan={visibleCols.length + ((canEdit || canDelete) ? 1 : 0)}>
                    {shipments.length === 0 ? (
                      <EmptyState
                        icon="🚚"
                        title="No shipments yet"
                        subtitle="Track vehicle, transporter, LR number, and freight cost for every dispatch."
                        actionLabel={canEdit ? 'Add Shipment' : undefined}
                        onAction={canEdit ? openCreate : undefined}
                      />
                    ) : (
                      <EmptyState icon="🔍" title="No shipments match" subtitle="Try adjusting your search or filters." />
                    )}
                  </td></tr>
                ) : filtered.map((s) => {
                  const cell = (key) => {
                    switch (key) {
                      case 'shipmentNo': return <td key={key} className="cell-strong">{s.shipmentNo}</td>
                      case 'company': return <td key={key}>{s.company || '—'}</td>
                      case 'orderNo': return (
                        <td key={key} className="cell-mono">
                          {s.orderNo ? (
                            <button type="button" className="btn-link" style={{ color: 'var(--teal-600)', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={() => navigate(`/orders?q=${encodeURIComponent(s.orderNo)}`)}>
                              {s.orderNo}
                            </button>
                          ) : '—'}
                        </td>
                      )
                      case 'invoiceNo': return (
                        <td key={key} className="cell-mono">
                          {s.invoiceNo ? (
                            <button type="button" style={{ color: 'var(--teal-600)', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={() => navigate(`/invoices?q=${encodeURIComponent(s.invoiceNo)}`)}>
                              {s.invoiceNo}
                            </button>
                          ) : '—'}
                        </td>
                      )
                      case 'route': return (
                        <td key={key} style={{ fontSize: 12.5 }}>
                          {s.origin || '—'} <span style={{ color: 'var(--ink-300)' }}>→</span> {s.destination || '—'}
                        </td>
                      )
                      case 'transporter': return <td key={key}>{s.transporter || '—'}</td>
                      case 'vehicleNo': return <td key={key} className="cell-mono">{s.vehicleNo || '—'}</td>
                      case 'mode': return <td key={key}>{s.mode || '—'}</td>
                      case 'dispatchDate': return <td key={key} className="cell-mono">{s.dispatchDate || '—'}</td>
                      case 'expectedDelivery': return <td key={key} className="cell-mono">{s.expectedDelivery || '—'}</td>
                      case 'status': return <td key={key}><Pill tone={STATUS_TONE[s.status]}>{s.status}</Pill></td>
                      case 'freightCost': return <td key={key} className="cell-mono">{s.freightCost ? formatINR(s.freightCost) : '—'}</td>
                      case 'freightStatus': return (
                        <td key={key}>
                          {s.freightPaidBy === 'Us (Prepaid)' ? (
                            <Pill tone={FREIGHT_STATUS_TONE[s.freightPaymentStatus]}>{s.freightPaymentStatus}</Pill>
                          ) : (
                            <span className="cell-muted" style={{ fontSize: 12 }}>{s.freightPaidBy}</span>
                          )}
                        </td>
                      )
                      default: return null
                    }
                  }
                  return (
                    <tr key={s.id}>
                      {visibleCols.map((key) => cell(key))}
                      {(canEdit || canDelete) && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><IconEdit width={13} height={13} /></button>}
                            {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(s)}><IconTrash width={13} height={13} /></button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Transporters' && (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <StatCard icon={IconTruck} tone="blue" label="Transporters" value={ledger.length} mono />
            <StatCard icon={IconRupee} tone="teal" label="Total Freight (Prepaid trips)" value={formatINR(ledger.reduce((sum, r) => sum + r.totalFreight, 0))} mono />
            <StatCard icon={IconRupee} tone="red" label="Total Payable" value={formatINR(ledger.reduce((sum, r) => sum + r.due, 0))} mono />
          </div>

          <div className="table-wrap sticky-first-col">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transporter</th>
                  <th>Trips</th>
                  <th>Total Freight</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton cols={7} rows={4} />
                ) : ledger.length === 0 ? (
                  <tr className="empty-row"><td colSpan={7}>
                    <EmptyState icon="🧾" title="No transporters yet" subtitle="Transporters appear here once you add shipments." />
                  </td></tr>
                ) : ledger.map((r) => (
                  <tr key={r.transporter}>
                    <td className="cell-strong">{r.transporter}</td>
                    <td className="cell-mono">{r.trips}</td>
                    <td className="cell-mono">{formatINR(r.totalFreight)}</td>
                    <td className="cell-mono">{formatINR(r.totalPaid)}</td>
                    <td className="cell-mono" style={r.due > 0 ? { color: 'var(--red-600)', fontWeight: 600 } : undefined}>{formatINR(r.due)}</td>
                    <td><Pill tone={r.due > 0 ? 'red' : 'teal'}>{r.due > 0 ? 'Due' : 'Settled'}</Pill></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(r.transporter); setTab('Shipments') }} title="View shipments">
                          <IconChevronRight width={14} height={14} />
                        </button>
                        {canEdit && r.due > 0 && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openPay(r)}>Record Payment</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Edit Shipment' : 'Add Shipment'}
          size="lg"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="shipment-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add shipment'}
              </button>
            </>
          }
        >
          <form id="shipment-form" onSubmit={handleSave}>
            <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="field">
                <label>Customer</label>
                <input required list="logi-companies" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Select or type…" />
                <datalist id="logi-companies">{companyOptions.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="field">
                <label>Linked order (optional)</label>
                <input list="logi-orders" value={form.orderNo} onChange={(e) => setForm(applyOrderLink(e.target.value, form))} placeholder="e.g. ORD-2026-0301" />
                <datalist id="logi-orders">{orderNoOptions.map((o) => <option key={o} value={o} />)}</datalist>
              </div>
              <div className="field">
                <label>Linked invoice (optional)</label>
                <input list="logi-invoices" value={form.invoiceNo} onChange={(e) => setForm(applyInvoiceLink(e.target.value, form))} placeholder="e.g. INV-2026-0041" />
                <datalist id="logi-invoices">{invoiceNoOptions.map((i) => <option key={i} value={i} />)}</datalist>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Origin</label>
                <input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Mumbai (Bhiwandi)" />
              </div>
              <div className="field">
                <label>Destination</label>
                <input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Rajkot, Gujarat" />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Transporter</label>
                <input required list="logi-transporters" value={form.transporter} onChange={(e) => setForm({ ...form, transporter: e.target.value })} placeholder="e.g. VRL Logistics" />
                <datalist id="logi-transporters">{transporterOptions.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div className="field">
                <label>Mode</label>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  {TRANSPORT_MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Vehicle number</label>
                <input value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value.toUpperCase() })} placeholder="e.g. MH04AB1234" />
              </div>
              <div className="field">
                <label>LR / GR number</label>
                <input value={form.lrNumber} onChange={(e) => setForm({ ...form, lrNumber: e.target.value })} placeholder="e.g. LR-88213" />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Driver name</label>
                <input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
              </div>
              <div className="field">
                <label>Driver phone</label>
                <input value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} />
              </div>
            </div>

            <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="field">
                <label>Dispatch date</label>
                <input type="date" value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} />
              </div>
              <div className="field">
                <label>Expected delivery</label>
                <input type="date" value={form.expectedDelivery} onChange={(e) => setForm({ ...form, expectedDelivery: e.target.value })} />
              </div>
              <div className="field">
                <label>Actual delivery</label>
                <input type="date" value={form.actualDelivery} onChange={(e) => setForm({ ...form, actualDelivery: e.target.value })} />
              </div>
            </div>

            <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {SHIPMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Distance (km)</label>
                <input type="number" min="0" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} placeholder="e.g. 280" />
              </div>
              <div className="field">
                <label>E-Way Bill no. (optional)</label>
                <input value={form.ewayBillNo} onChange={(e) => setForm({ ...form, ewayBillNo: e.target.value })} placeholder="12-digit EBN" />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Freight cost</label>
                <input type="number" min="0" value={form.freightCost} onChange={(e) => setForm({ ...form, freightCost: e.target.value })} placeholder="e.g. 8500" />
              </div>
              <div className="field">
                <label>Freight paid by</label>
                <select value={form.freightPaidBy} onChange={(e) => setForm({ ...form, freightPaidBy: e.target.value })}>
                  {FREIGHT_PAID_BY.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {form.freightPaidBy === 'Us (Prepaid)' && (
              <div className="field-row">
                <div className="field">
                  <label>Freight payment status</label>
                  <select value={form.freightPaymentStatus} onChange={(e) => setForm({ ...form, freightPaymentStatus: e.target.value })}>
                    {FREIGHT_PAYMENT_STATUSES.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Amount paid so far</label>
                  <input type="number" min="0" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} placeholder="e.g. 5000" />
                </div>
              </div>
            )}

            <div className="field">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Packaging, special handling, delays, etc." />
            </div>
          </form>
        </Modal>
      )}

      {payTransporter && (
        <Modal
          title={`Record Payment — ${payTransporter.transporter}`}
          onClose={() => setPayTransporter(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPayTransporter(null)}>Cancel</button>
              <button className="btn btn-primary" form="pay-form" type="submit" disabled={paying}>
                {paying ? 'Recording…' : 'Record Payment'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 0 }}>
            Currently owed: <strong>{formatINR(payTransporter.due)}</strong> across {payTransporter.trips} trip{payTransporter.trips === 1 ? '' : 's'}.
            The amount below is applied to the oldest unpaid trips first.
          </p>
          <form id="pay-form" onSubmit={handleRecordPayment}>
            <div className="field">
              <label>Payment amount</label>
              <input required type="number" min="1" max={payTransporter.due} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
