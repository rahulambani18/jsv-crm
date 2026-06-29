import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus } from '../components/Icons.jsx'
import '../styles/components.css'

function emptyForm() {
  return { company: '', items: '', total: '', validUntil: '', status: 'Draft' }
}

export default function Quotations() {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    api.quotations.list().then((data) => { setQuotations(data); setLoading(false) })
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const record = {
      ...form,
      items: Number(form.items) || 0,
      total: Number(form.total) || 0,
      quoteNo: `QT-2026-${String(120 + quotations.length).padStart(4, '0')}`,
    }
    await api.quotations.insert(record)
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm())
    refresh()
  }

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle={`${quotations.length} quote${quotations.length === 1 ? '' : 's'}`}
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <IconPlus width={15} height={15} /> New Quotation
          </button>
        }
      />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Quote #</th><th>Company</th><th>Items</th><th>Total</th><th>Valid Until</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={7}>Loading quotations…</td></tr>
            ) : quotations.length === 0 ? (
              <tr className="empty-row"><td colSpan={7}>No quotations yet.</td></tr>
            ) : quotations.map((q) => (
              <tr key={q.id}>
                <td className="cell-mono">{q.quoteNo}</td>
                <td className="cell-strong">{q.company}</td>
                <td>{q.items}</td>
                <td className="cell-mono">₹{Number(q.total).toLocaleString('en-IN')}</td>
                <td className="cell-mono">{q.validUntil}</td>
                <td><Pill>{q.status}</Pill></td>
                <td><button className="btn btn-ghost btn-sm">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title="New Quotation"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="quote-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save quotation'}
              </button>
            </>
          }
        >
          <form id="quote-form" onSubmit={handleCreate}>
            <div className="field">
              <label>Company</label>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label># Line items</label>
                <input type="number" min="0" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} />
              </div>
              <div className="field">
                <label>Total (₹)</label>
                <input type="number" min="0" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Valid until</label>
                <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Draft</option><option>Sent</option><option>Under Negotiation</option><option>Accepted</option><option>Rejected</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
