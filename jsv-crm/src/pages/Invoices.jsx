import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ExportBar from '../components/ExportBar.jsx'
import { IconPlus, IconSearch, IconEdit } from '../components/Icons.jsx'
import '../styles/components.css'

const GST_RATE = 18

const STATUS_OPTIONS = ['Draft', 'Sent', 'Paid', 'Unpaid', 'Overdue', 'Cancelled']
const PAYMENT_MODES = ['NEFT', 'RTGS', 'Cheque', 'Cash', 'UPI', 'Bank Transfer']

function emptyForm() {
  return {
    company: '', orderId: '', issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '', subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
    status: 'Draft', paymentMode: '', notes: '',
  }
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

function printInvoice(inv) {
  const html = `
  <html><head><title>Invoice ${inv.invoiceNo}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; padding: 32px; color: #1a1a1a; }
    .header { display: flex; justify-content: space-between; margin-bottom: 28px; border-bottom: 2px solid #0f1e3d; padding-bottom: 16px; }
    .brand h1 { margin: 0; font-size: 22px; color: #0f1e3d; }
    .brand p { margin: 4px 0 0; font-size: 11px; color: #666; }
    .inv-meta { text-align: right; }
    .inv-meta h2 { margin: 0; font-size: 28px; font-weight: 800; color: #0f1e3d; letter-spacing: -1px; }
    .inv-meta p { margin: 4px 0 0; font-size: 12px; color: #666; }
    .parties { display: flex; justify-content: space-between; margin: 24px 0; }
    .party h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
    .party p { margin: 2px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #0f1e3d; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; letter-spacing: 0.04em; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e5e5; }
    .totals { float: right; width: 280px; }
    .totals table { margin: 0; }
    .totals td { padding: 6px 12px; }
    .totals .grand { font-weight: 700; font-size: 15px; background: #f5f5f5; }
    .footer { clear: both; margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
  </style></head>
  <body>
    <div class="header">
      <div class="brand">
        <h1>JSV INGREDIENT</h1>
        <p>Formerly known as Sanjay Chemicals - P.M. Vora & Co.</p>
        <p>301, Sterling Estate, Kachpada, Malad (W), Mumbai - 400 064</p>
        <p>MOBILE: +91 9820155312 | EMAIL: smit.vora@jsvingredient.net</p>
      </div>
      <div class="inv-meta">
        <h2>INVOICE</h2>
        <p><strong>${inv.invoiceNo}</strong></p>
        <p>Issue Date: ${inv.issueDate}</p>
        <p>Due Date: ${inv.dueDate}</p>
      </div>
    </div>
    <div class="parties">
      <div class="party">
        <h3>Bill To</h3>
        <p><strong>${inv.company}</strong></p>
      </div>
    </div>
    <div class="totals">
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">${formatINR(inv.subtotal)}</td></tr>
        <tr><td>CGST (9%)</td><td style="text-align:right">${formatINR(inv.cgst)}</td></tr>
        <tr><td>SGST (9%)</td><td style="text-align:right">${formatINR(inv.sgst)}</td></tr>
        ${inv.igst ? `<tr><td>IGST (18%)</td><td style="text-align:right">${formatINR(inv.igst)}</td></tr>` : ''}
        <tr class="grand"><td><strong>Total</strong></td><td style="text-align:right"><strong>${formatINR(inv.total)}</strong></td></tr>
        <tr><td>Status</td><td style="text-align:right"><strong>${inv.status}</strong></td></tr>
      </table>
    </div>
    <div class="footer">
      <p>Thank you for your business. Please pay by ${inv.dueDate}.</p>
      <p>JSV Ingredient Pvt Ltd | GSTIN: [Your GSTIN] | PAN: [Your PAN]</p>
    </div>
  </body></html>`
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 500)
}

export default function Invoices() {
  const { can } = useAuth()
  const canEdit = can('invoices', 'edit')
  const [invoices, setInvoices] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.invoices.list(), api.orders.list()]).then(([inv, ord]) => {
      setInvoices(inv); setOrders(ord); setLoading(false)
    })
  }

  // Auto-generate invoice from an order
  function generateFromOrder(order) {
    const subtotal = Number(order.subtotal || order.total / 1.18 || 0)
    const gst = Number(order.gstAmount || (subtotal * 0.18))
    setForm({
      company: order.company,
      orderId: order.id,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      subtotal: Math.round(subtotal),
      cgst: Math.round(gst / 2),
      sgst: Math.round(gst / 2),
      igst: 0,
      total: Math.round(subtotal + gst),
      status: 'Draft',
      paymentMode: '',
      notes: `Generated from order ${order.orderNo}`,
    })
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(inv) {
    setForm({ ...inv })
    setEditingId(inv.id)
    setShowModal(true)
  }

  function recalcGST(subtotal) {
    const sub = Number(subtotal) || 0
    const gst = Math.round(sub * GST_RATE / 100)
    setForm((f) => ({ ...f, subtotal: sub, cgst: Math.round(gst / 2), sgst: Math.round(gst / 2), igst: 0, total: sub + gst }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const invNo = editingId ? form.invoiceNo : `INV-2026-${String(40 + invoices.length + 1).padStart(4, '0')}`
      const record = { ...form, invoiceNo: invNo }
      if (editingId) await api.invoices.update(editingId, record)
      else await api.invoices.insert(record)
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

  const filtered = useMemo(() => invoices.filter((inv) => {
    const matchSearch = !search || [inv.invoiceNo, inv.company].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter
    return matchSearch && matchStatus
  }), [invoices, search, statusFilter])

  const totalPaid = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPending = invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((s, i) => s + Number(i.total || 0), 0)

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Invoices"
              headers={['Invoice #', 'Company', 'Issue Date', 'Due Date', 'Subtotal', 'CGST', 'SGST', 'Total', 'Status']}
              rows={filtered.map((i) => [i.invoiceNo, i.company, i.issueDate, i.dueDate, i.subtotal, i.cgst, i.sgst, i.total, i.status])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setEditingId(null); setShowModal(true) }}>
                <IconPlus width={15} height={15} /> New Invoice
              </button>
            )}
          </div>
        }
      />

      {/* Summary cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div><p className="stat-label">Total Invoiced</p><p className="stat-value mono">{formatINR(invoices.reduce((s, i) => s + Number(i.total || 0), 0))}</p></div></div>
        <div className="stat-card"><div><p className="stat-label">Paid</p><p className="stat-value mono" style={{ color: 'var(--teal-700)' }}>{formatINR(totalPaid)}</p></div></div>
        <div className="stat-card"><div><p className="stat-label">Pending / Overdue</p><p className="stat-value mono" style={{ color: 'var(--amber-600)' }}>{formatINR(totalPending)}</p></div></div>
      </div>

      {/* Auto-generate from order */}
      {canEdit && orders.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p className="panel-title" style={{ marginBottom: 10 }}>⚡ Generate invoice from order</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {orders.filter((o) => !invoices.find((i) => i.orderId === o.id)).map((o) => (
              <button key={o.id} className="btn btn-secondary btn-sm" onClick={() => generateFromOrder(o)}>
                {o.orderNo} — {o.company}
              </button>
            ))}
            {orders.every((o) => invoices.find((i) => i.orderId === o.id)) && (
              <span style={{ fontSize: 13, color: 'var(--ink-400)' }}>All orders have invoices.</span>
            )}
          </div>
        </div>
      )}

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search invoice #, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th><th>Company</th><th>Issue Date</th><th>Due Date</th>
              <th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={9}>Loading invoices…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={9}>No invoices yet. Generate one from an order above.</td></tr>
            ) : filtered.map((inv) => (
              <tr key={inv.id}>
                <td className="cell-mono cell-strong">{inv.invoiceNo}</td>
                <td className="cell-strong">{inv.company}</td>
                <td className="cell-mono">{inv.issueDate}</td>
                <td className="cell-mono" style={{ color: inv.status === 'Overdue' ? 'var(--red-600)' : undefined }}>{inv.dueDate}</td>
                <td className="cell-mono">{formatINR(inv.subtotal)}</td>
                <td className="cell-mono">{formatINR(Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0))}</td>
                <td className="cell-mono cell-strong">{formatINR(inv.total)}</td>
                <td><Pill>{inv.status}</Pill></td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(inv)}><IconEdit width={13} height={13} /></button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => printInvoice(inv)}>🖨 Print</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Edit Invoice' : 'New Invoice'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="invoice-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save invoice'}
              </button>
            </>
          }
        >
          <form id="invoice-form" onSubmit={handleSave}>
            <div className="field">
              <label>Company</label>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Issue date</label>
                <input type="date" required value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
              </div>
              <div className="field">
                <label>Due date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Subtotal (₹) — GST calculated automatically</label>
              <input type="number" min="0" value={form.subtotal} onChange={(e) => recalcGST(e.target.value)} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>CGST (9%) ₹</label>
                <input type="number" min="0" value={form.cgst} onChange={(e) => setForm({ ...form, cgst: Number(e.target.value), total: Number(form.subtotal) + Number(e.target.value) + Number(form.sgst) + Number(form.igst) })} />
              </div>
              <div className="field">
                <label>SGST (9%) ₹</label>
                <input type="number" min="0" value={form.sgst} onChange={(e) => setForm({ ...form, sgst: Number(e.target.value), total: Number(form.subtotal) + Number(form.cgst) + Number(e.target.value) + Number(form.igst) })} />
              </div>
              <div className="field">
                <label>IGST (18%) ₹</label>
                <input type="number" min="0" value={form.igst} onChange={(e) => setForm({ ...form, igst: Number(e.target.value), total: Number(form.subtotal) + Number(form.cgst) + Number(form.sgst) + Number(e.target.value) })} />
              </div>
            </div>
            <div className="field">
              <label>Total (₹)</label>
              <input type="number" min="0" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Payment mode</label>
                <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                  <option value="">— Select —</option>
                  {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
