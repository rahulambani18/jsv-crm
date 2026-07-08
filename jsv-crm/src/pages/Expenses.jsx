import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ExportBar from '../components/ExportBar.jsx'
import { IconPlus, IconSearch } from '../components/Icons.jsx'
import '../styles/components.css'

const CATEGORIES = ['Freight', 'Office', 'Travel', 'Packaging', 'Utilities', 'Marketing', 'Salary', 'Rent', 'Miscellaneous']
const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'Cheque', 'Credit Card', 'Company Account']
const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Reimbursed']

function emptyForm() {
  return { category: 'Freight', description: '', amount: '', date: new Date().toISOString().slice(0, 10), paidBy: '', paymentMode: 'UPI', receipt: '', status: 'Pending' }
}

function formatINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }

export default function Expenses() {
  const { can, user } = useAuth()
  const canEdit = can('expenses', 'edit')
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    api.expenses.list().then((data) => { setExpenses(data); setLoading(false) })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const expNo = `EXP-2026-${String(10 + expenses.length + 1).padStart(4, '0')}`
      await api.expenses.insert({ ...form, expenseNo: expNo, amount: Number(form.amount), paidBy: form.paidBy || user?.name || 'Admin' })
      setShowModal(false)
      setForm(emptyForm())
      refresh()
    } catch (err) {
      alert('Could not save: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => expenses.filter((e) => {
    const matchSearch = !search || [e.expenseNo, e.description, e.category, e.paidBy].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchCat = categoryFilter === 'All categories' || e.category === categoryFilter
    return matchSearch && matchCat
  }), [expenses, search, categoryFilter])

  const totalThisMonth = expenses.filter((e) => (e.date || '').startsWith('2026-07')).reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const byCategory = CATEGORIES.map((c) => ({ category: c, total: expenses.filter((e) => e.category === c).reduce((s, e) => s + Number(e.amount || 0), 0) })).filter((c) => c.total > 0)

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} expense${expenses.length === 1 ? '' : 's'} recorded`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Expenses"
              headers={['Expense #', 'Category', 'Description', 'Amount', 'Date', 'Paid By', 'Mode', 'Status']}
              rows={filtered.map((e) => [e.expenseNo, e.category, e.description, e.amount, e.date, e.paidBy, e.paymentMode, e.status])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setShowModal(true) }}>
                <IconPlus width={15} height={15} /> Add Expense
              </button>
            )}
          </div>
        }
      />

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div><p className="stat-label">Total Expenses</p><p className="stat-value mono">{formatINR(totalAll)}</p></div></div>
        <div className="stat-card"><div><p className="stat-label">This Month</p><p className="stat-value mono">{formatINR(totalThisMonth)}</p></div></div>
        <div className="stat-card">
          <div style={{ width: '100%' }}>
            <p className="stat-label" style={{ marginBottom: 6 }}>By Category</p>
            {byCategory.slice(0, 3).map((c) => (
              <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-700)', marginBottom: 2 }}>
                <span>{c.category}</span><span className="mono">{formatINR(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search description, category, paid by…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option>All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Expense #</th><th>Category</th><th>Description</th><th>Amount</th><th>Date</th><th>Paid By</th><th>Mode</th><th>Receipt</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={9}>Loading expenses…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={9}>No expenses recorded yet.</td></tr>
            ) : filtered.map((exp) => (
              <tr key={exp.id}>
                <td className="cell-mono">{exp.expenseNo}</td>
                <td><span className="pill pill-gray">{exp.category}</span></td>
                <td style={{ maxWidth: 240 }}>{exp.description}</td>
                <td className="cell-mono cell-strong">{formatINR(exp.amount)}</td>
                <td className="cell-mono">{exp.date}</td>
                <td>{exp.paidBy}</td>
                <td>{exp.paymentMode}</td>
                <td>
                  {exp.receipt ? (
                    <a href={exp.receipt} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-600)' }}>📎 View</a>
                  ) : <span className="cell-muted">—</span>}
                </td>
                <td><Pill>{exp.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title="Add Expense"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="expense-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save expense'}
              </button>
            </>
          }
        >
          <form id="expense-form" onSubmit={handleSave}>
            <div className="field-row">
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Amount (₹)</label>
                <input type="number" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="field">
                <label>Paid by</label>
                <input value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} placeholder={user?.name || 'Name'} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Payment mode</label>
                <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                  {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Receipt link (Google Drive)</label>
              <input value={form.receipt} onChange={(e) => setForm({ ...form, receipt: e.target.value })} placeholder="Paste share link to receipt image/PDF" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
