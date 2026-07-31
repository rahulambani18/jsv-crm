import { useEffect, useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ExportBar from '../components/ExportBar.jsx'
import TallyImportButton from '../components/TallyImportButton.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import { IconPlus, IconSearch, IconTrash, IconDollarSign, IconCalendar, IconReceipt, IconFlame, IconChevronRight, IconRupee, IconAlertTriangle } from '../components/Icons.jsx'
import StatCard from '../components/StatCard.jsx'
import Pagination from '../components/Pagination.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { getOverdueInvoices, daysOverdue } from '../lib/overdue.js'
import {
  buildPaymentModeBreakdown, buildPaymentAgingBuckets,
  buildOutstandingSummary, buildPartialPayments,
} from '../lib/paymentAnalytics.js'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import '../styles/components.css'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'

const MODE_COLORS = ['#0d9488', '#0f1e3d', '#d97706', '#6b81a8', '#b42318', '#a3a9b3']
const AGING_COLORS = ['#0d9488', '#d97706', '#c2551a', '#b42318']

const PAYMENT_MODES = ['NEFT', 'RTGS', 'Cheque', 'Cash', 'UPI', 'Bank Transfer']
const STATUS_OPTIONS = ['Completed', 'Pending', 'Failed', 'Refunded']

const PAYMENT_COLUMNS = [
  { key: 'paymentNo', label: 'Payment #' },
  { key: 'company', label: 'Company' },
  { key: 'amount', label: 'Amount' },
  { key: 'date', label: 'Date' },
  { key: 'mode', label: 'Mode' },
  { key: 'reference', label: 'Reference' },
  { key: 'linkedInvoice', label: 'Linked Invoice' },
  { key: 'status', label: 'Status' },
]

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
  const [visibleCols, setVisibleCols] = useState(PAYMENT_COLUMNS.map((c) => c.key))
  const [search, setSearch] = usePersistedFilter('jsv_filter_payments_search', undefined, '')
  const [modeFilter, setModeFilter] = usePersistedFilter('jsv_filter_payments_mode', undefined, 'All modes')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())

  useEffect(() => { refresh() }, [])
  useAutoRefresh(() => refresh(true), 60000)

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([api.payments.list(), api.invoices.list()]).then(([p, i]) => {
      setPayments(p); setInvoices(i); setLoading(false)
    })
  }

  const overdueInvoices = useMemo(() => getOverdueInvoices(invoices), [invoices])
  const overdueAmount = useMemo(() => overdueInvoices.reduce((s, i) => s + Number(i.total || 0), 0), [overdueInvoices])

  const modeData = useMemo(() => buildPaymentModeBreakdown(payments), [payments])
  const agingData = useMemo(() => buildPaymentAgingBuckets(invoices, payments), [invoices, payments])
  const outstandingSummary = useMemo(() => buildOutstandingSummary(invoices, payments), [invoices, payments])
  const partialPayments = useMemo(() => buildPartialPayments(invoices, payments), [invoices, payments])

  function openPaymentForInvoice(inv) {
    setForm({ ...emptyForm(), invoiceId: inv.id, company: inv.company, amount: inv.total })
    setShowModal(true)
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

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search, modeFilter])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  async function handleDelete(payment) {
    if (!confirm(`Delete payment "${payment.paymentNo}"? This cannot be undone.`)) return
    try {
      await api.payments.remove(payment.id)
      refresh()
    } catch (err) {
      alert('Could not delete: ' + (err.message || 'Unknown error'))
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
      prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))
    )
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} payment${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.payments.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} payment${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected payments: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((p) => selected.has(p.id))
    exportCSV(
      'Payments',
      ['Payment #', 'Company', 'Amount', 'Date', 'Mode', 'Reference', 'Status'],
      rows.map((p) => [p.paymentNo, p.company, p.amount, p.date, p.mode, p.reference, p.status])
    )
  }

  const totalReceived = payments.filter((p) => p.status === 'Completed').reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={payments.length === 0 ? 'No payments yet' : `${payments.length} payment${payments.length === 1 ? '' : 's'} received`}
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

      <div className="stat-grid">
        <StatCard icon={IconDollarSign} tone="teal" label="Total Received" value={formatINR(totalReceived)} mono />
        <StatCard icon={IconCalendar} tone="blue" label="This Month" value={formatINR(payments.filter((p) => (p.date || '').startsWith('2026-07')).reduce((s, p) => s + Number(p.amount || 0), 0))} mono />
        <StatCard icon={IconReceipt} tone="blue" label="Payments Count" value={payments.length} />
        <StatCard icon={IconFlame} tone="red" label="Overdue Invoices" value={`${overdueInvoices.length} · ${formatINR(overdueAmount)}`} mono />
      </div>

      <div className="panel-row">
        <div className="panel">
          <p className="panel-title">Payment Mode Breakdown</p>
          {modeData.length === 0 ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No completed payments yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={modeData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {modeData.map((_, i) => <Cell key={i} fill={MODE_COLORS[i % MODE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel">
          <p className="panel-title">Payment Aging (Outstanding)</p>
          {agingData.every((b) => b.amount === 0) ? (
            <p style={{ color: 'var(--ink-300)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Nothing outstanding right now.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-200)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={44}>
                  {agingData.map((b, i) => <Cell key={b.bucket} fill={AGING_COLORS[i % AGING_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon={IconRupee} tone="red" label="Outstanding Summary" value={formatINR(outstandingSummary.totalOutstanding)} mono />
        <StatCard icon={IconReceipt} tone="amber" label="Open Invoices" value={outstandingSummary.invoiceCount} />
        <StatCard icon={IconAlertTriangle} tone="amber" label="Partial Payments" value={partialPayments.length} />
        <StatCard
          icon={IconFlame}
          tone="red"
          label="Oldest Overdue"
          value={outstandingSummary.oldestDueDate ? `${outstandingSummary.maxDaysOverdue}d (due ${outstandingSummary.oldestDueDate})` : '—'}
        />
      </div>

      {partialPayments.length > 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <p className="panel-title">Partial Payments ({partialPayments.length})</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Invoice</th><th>Company</th><th>Total</th><th>Paid</th><th>Remaining</th></tr>
              </thead>
              <tbody>
                {partialPayments.map(({ invoice, paid, total, remaining }) => (
                  <tr key={invoice.id}>
                    <td className="cell-mono cell-strong">{invoice.invoiceNo}</td>
                    <td className="cell-strong">{invoice.company}</td>
                    <td className="cell-mono">{formatINR(total)}</td>
                    <td className="cell-mono" style={{ color: 'var(--teal-700)', fontWeight: 600 }}>{formatINR(paid)}</td>
                    <td className="cell-mono" style={{ color: 'var(--red-600)', fontWeight: 600 }}>{formatINR(remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {overdueInvoices.length > 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <p className="panel-title">Overdue Invoices Needing Follow-up ({overdueInvoices.length})</p>
          <div className="attention-list">
            {overdueInvoices
              .slice()
              .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
              .map((inv) => {
                const days = daysOverdue(inv.dueDate)
                return (
                  <button
                    key={inv.id}
                    className="attention-row"
                    onClick={() => canEdit && openPaymentForInvoice(inv)}
                    disabled={!canEdit}
                    title={canEdit ? 'Record a payment against this invoice' : undefined}
                  >
                    <span className="attention-icon red"><IconReceipt /></span>
                    <span className="attention-text">
                      <span className="attention-title">{inv.company} · {inv.invoiceNo}</span>
                      <span className="attention-detail">{formatINR(inv.total)} · {days} day{days === 1 ? '' : 's'} overdue (due {inv.dueDate})</span>
                    </span>
                    <Pill tone="red">Overdue</Pill>
                    {canEdit && <IconChevronRight />}
                  </button>
                )
              })}
          </div>
        </div>
      )}

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search payment #, company, reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          <option>All modes</option>
          {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
        </select>
        <ColumnChooser columns={PAYMENT_COLUMNS} storageKey="jsv_cols_payments" onChange={setVisibleCols} />
      </div>

      {(canEdit || canDelete) && (
        <BulkActionsBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onExport={handleBulkExport}
          onDelete={canDelete ? handleBulkDelete : undefined}
        />
      )}

      <div className="table-wrap sticky-first-col">
        <table className="data-table">
          <thead>
            <tr>
              {(canEdit || canDelete) && (
                <th className="header-checkbox-cell">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              {visibleCols.map((key) => (
                <th key={key}>{PAYMENT_COLUMNS.find((c) => c.key === key)?.label}</th>
              ))}{canDelete && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={visibleCols.length + ((canEdit || canDelete) ? 1 : 0) + (canDelete ? 1 : 0)} rows={6} />
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + ((canEdit || canDelete) ? 1 : 0) + (canDelete ? 1 : 0)}>
                {payments.length === 0 ? (
                  <EmptyState
                    icon="💳"
                    title="No payments recorded yet"
                    subtitle="Record a payment to track what's been received against invoices."
                    actionLabel={canEdit ? 'Record Payment' : undefined}
                    onAction={canEdit ? () => { setForm(emptyForm()); setShowModal(true) } : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No payments match your filters" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : paged.map((p) => {
              const inv = invoices.find((i) => i.id === p.invoiceId)
              const cell = (key) => {
                switch (key) {
                  case 'paymentNo': return <td key={key} className="cell-mono cell-strong">{p.paymentNo}</td>
                  case 'company': return <td key={key} className="cell-strong">{p.company}</td>
                  case 'amount': return <td key={key} className="cell-mono" style={{ color: 'var(--teal-700)', fontWeight: 600 }}>{formatINR(p.amount)}</td>
                  case 'date': return <td key={key} className="cell-mono">{p.date}</td>
                  case 'mode': return <td key={key}><span className="pill pill-navy">{p.mode}</span></td>
                  case 'reference': return <td key={key} className="cell-mono" style={{ fontSize: 12 }}>{p.reference || '—'}</td>
                  case 'linkedInvoice': return <td key={key} className="cell-mono" style={{ fontSize: 12 }}>{inv ? inv.invoiceNo : '—'}</td>
                  case 'status': return <td key={key}><Pill>{p.status}</Pill></td>
                  default: return null
                }
              }
              return (
                <tr key={p.id}>
                  {(canEdit || canDelete) && (
                    <td className="header-checkbox-cell">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} />
                    </td>
                  )}
                  {visibleCols.map((key) => cell(key))}
                  {canDelete && (
                    <td>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(p)} title="Delete"><IconTrash width={13} height={13} /></button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />

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
                {invoices.filter((i) => i.status !== 'Paid').map((i) => {
                  const overdue = overdueInvoices.some((o) => o.id === i.id)
                  return (
                    <option key={i.id} value={i.id}>
                      {overdue ? '⚠ ' : ''}{i.invoiceNo} — {i.company} — ₹{Number(i.total).toLocaleString('en-IN')}{overdue ? ` — ${daysOverdue(i.dueDate)}d overdue` : ''}
                    </option>
                  )
                })}
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
