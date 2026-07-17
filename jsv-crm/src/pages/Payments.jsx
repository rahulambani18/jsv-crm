import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ExportBar from '../components/ExportBar.jsx'
import TallyImportButton from '../components/TallyImportButton.jsx'
import { IconPlus, IconSearch, IconTrash } from '../components/Icons.jsx'
import '../styles/components.css'

const PAYMENT_MODES = ['NEFT', 'RTGS', 'Cheque', 'Cash', 'UPI', 'Bank Transfer']
const STATUS_OPTIONS = ['Completed', 'Pending', 'Failed', 'Refunded']

function emptyForm() {
  return { company: '', invoiceId: '', amount: '', date: new Date().toISOString().slice(0, 10), mode: 'NEFT', reference: '', notes: '', status: 'Completed' }
}

function formatINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

export default function Payments() {
  const { can } = useAuth()
  const canEdit = can('payments', 'edit')
  const canDelete = can('payments', 'delete')
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('All modes')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.payments.list(), api.invoices.list()]).then(([p, i]) => {
      setPayments(p); setInvoices(i); setLoading(false)
    })
  }

  async function handleTallyImport(records) {
    let imported = 0
    for (const r of records) {
      try {
        await api.payments.insert({
          ...r,
          paymentNo: `PAY-TALLY-${Date.now()}-${imported}`,
        })
        imported++
      } catch {}
    }
    alert(`✅ Imported ${imported} payments from Tally!`)
    refresh()
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payNo = `PAY-2026-${String(20 + payments.length + 1).padStart(4, '0')}`
      await api.payments.insert({ ...form, paymentNo: payNo, amount: Number(form.amount) })
      // Mark linked invoice as paid if full amount
      if (form.invoiceId) {
        const inv = invoices.find((i) => i.id === form.invoiceId)
        if (inv && Number(form.amount) >= Number(inv.total)) {
          await api.invoices.update(form.invoiceId, { status: 'Paid', paymentMode: form.mode })
        }
      }
      setShowModal(false)
      setForm(emptyForm())
      refresh()
    } catch (err) {
      alert('Could not save: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => payments.filter((p) => {
    const matchSearch = !search || [p.paymentNo, p.company, p.reference].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchMode = modeFilter === 'All modes' || p.mode === modeFilter
    return matchSearch && matchMode
  }), [payments, search, modeFilter])

  async function handleDelete(payment) {
    if (!confirm(`Delete payment "${payment.paymentNo}"? This cannot be undone.`)) return
    try {
      await api.payments.remove(payment.id)
      refresh()
    } catch (err) {
      alert('Could not delete: ' + (err.message || 'Unknown error'))
    }
  }

  const totalReceived = payments.filter((p) => p.status === 'Completed').reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={`${payments.length} payment${payments.length === 1 ? '' : 's'} received`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <TallyImportButton onImport={handleTallyImport} />
            <ExportBar
              title="Payments"
              headers={['Payment #', 'Company', 'Amount', 'Date', 'Mode', 'Reference', 'Status']}
              rows={filtered.map((p) => [p.paymentNo, p.company, p.amount, p.date, p.mode, p.reference, p.status])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setShowModal(true) }}>
                <IconPlus width={15} height={15} /> Record Payment
              </button>
            )}
          </div>
        }
      />

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div><p className="stat-label">Total Received</p><p className="stat-value mono" style={{ color: 'var(--teal-700)' }}>{formatINR(totalReceived)}</p></div></div>
        <div className="stat-card"><div><p className="stat-label">This Month</p><p className="stat-value mono">{formatINR(payments.filter((p) => (p.date || '').startsWith('2026-07')).reduce((s, p) => s + Number(p.amount || 0), 0))}</p></div></div>
        <div className="stat-card"><div><p className="stat-label">Payments Count</p><p className="stat-value">{payments.length}</p></div></div>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search payment #, company, reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          <option>All modes</option>
          {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Payment #</th><th>Company</th><th>Amount</th><th>Date</th><th>Mode</th><th>Reference</th><th>Linked Invoice</th><th>Status</th>{canDelete && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={canDelete ? 9 : 8}>Loading payments…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={canDelete ? 9 : 8}>No payments recorded yet.</td></tr>
            ) : filtered.map((p) => {
              const inv = invoices.find((i) => i.id === p.invoiceId)
              return (
                <tr key={p.id}>
                  <td className="cell-mono cell-strong">{p.paymentNo}</td>
                  <td className="cell-strong">{p.company}</td>
                  <td className="cell-mono" style={{ color: 'var(--teal-700)', fontWeight: 600 }}>{formatINR(p.amount)}</td>
                  <td className="cell-mono">{p.date}</td>
                  <td><span className="pill pill-navy">{p.mode}</span></td>
                  <td className="cell-mono" style={{ fontSize: 12 }}>{p.reference || '—'}</td>
                  <td className="cell-mono" style={{ fontSize: 12 }}>{inv ? inv.invoiceNo : '—'}</td>
                  <td><Pill>{p.status}</Pill></td>
                  {canDelete && (
                    <td>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(p)}><IconTrash width={13} height={13} /></button>
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
          title="Record Payment"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="payment-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save payment'}
              </button>
            </>
          }
        >
          <form id="payment-form" onSubmit={handleSave}>
            <div className="field">
              <label>Company</label>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="field">
              <label>Link to invoice (optional)</label>
              <select value={form.invoiceId} onChange={(e) => {
                const inv = invoices.find((i) => i.id === e.target.value)
                setForm({ ...form, invoiceId: e.target.value, company: inv ? inv.company : form.company, amount: inv ? inv.total : form.amount })
              }}>
                <option value="">— Select invoice —</option>
                {invoices.filter((i) => i.status !== 'Paid').map((i) => (
                  <option key={i.id} value={i.id}>{i.invoiceNo} — {i.company} — ₹{Number(i.total).toLocaleString('en-IN')}</option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Amount (₹)</label>
                <input type="number" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Payment mode</label>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Reference / Cheque #</label>
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="UTR / Cheque number" />
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
