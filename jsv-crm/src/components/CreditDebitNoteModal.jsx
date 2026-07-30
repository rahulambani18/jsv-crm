import { useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../lib/api.js'
import { showToast } from '../lib/toast.js'

const REASONS = {
  Credit: ['Rate difference', 'Return of goods', 'Discount / scheme adjustment', 'Damaged / short delivery', 'Other'],
  Debit: ['Rate difference', 'Additional freight', 'Shortfall in quantity billed', 'Other'],
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

// Opened from the Invoices row menu for either "Credit Note" or
// "Debit Note" — same form, different table (api.creditNotes /
// api.debitNotes) and numbering prefix (CN- / DN-).
export default function CreditDebitNoteModal({ type, invoice, existingCount, onClose, onSaved }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState(REASONS[type][0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const table = type === 'Credit' ? api.creditNotes : api.debitNotes
  const prefix = type === 'Credit' ? 'CN' : 'DN'

  async function handleSave(e) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { showToast('Enter an amount', 'error'); return }
    setSaving(true)
    try {
      const noteNo = `${prefix}-2026-${String(1 + existingCount).padStart(4, '0')}`
      await table.insert({
        noteNo,
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        company: invoice.company,
        date,
        amount: Number(amount),
        reason,
        notes,
      })
      showToast(`${type} Note ${noteNo} created for ${invoice.invoiceNo}`)
      onSaved()
    } catch (err) {
      showToast(`Could not save ${type.toLowerCase()} note: ` + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`New ${type} Note — ${invoice.invoiceNo}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="note-form" type="submit" disabled={saving}>
            {saving ? 'Saving…' : `Save ${type} Note`}
          </button>
        </>
      }
    >
      <form id="note-form" onSubmit={handleSave}>
        <div className="field">
          <label>Against invoice</label>
          <input value={`${invoice.invoiceNo} — ${invoice.company} (${formatINR(invoice.total)})`} disabled />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Amount (₹)</label>
            <input type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS[type].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </form>
    </Modal>
  )
}
