import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconTrash, IconSearch } from '../components/Icons.jsx'
import '../styles/components.css'

function emptyLineItem() {
  return { product: '', qty: '', packingSize: '', price: '' }
}

function emptyForm() {
  return { company: '', validUntil: '', status: 'Draft', lineItems: [emptyLineItem()] }
}

export default function Quotations() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [quotations, setQuotations] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.quotations.list(), api.products.list(), api.customers.list()]).then(([q, p, c]) => {
      setQuotations(q); setProducts(p); setCustomers(c); setLoading(false)
    })
  }

  const productOptions = useMemo(() => products.map((p) => p.name), [products])
  const customerOptions = useMemo(() => customers.map((c) => c.company), [customers])

  const filtered = useMemo(() => quotations.filter((q) =>
    !search || [q.quoteNo, q.company].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
  ), [quotations, search])

  function updateLineItem(i, patch) {
    const items = [...form.lineItems]
    items[i] = { ...items[i], ...patch }
    setForm((f) => ({ ...f, lineItems: items }))
  }

  function addLineItem() { setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] })) }
  function removeLineItem(i) { setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) })) }

  const totals = useMemo(() => {
    const subtotal = form.lineItems.reduce((s, li) => s + (Number(li.qty) || 0) * (Number(li.price) || 0), 0)
    const gst = Math.round(subtotal * 0.18 * 100) / 100
    return { subtotal, gst, total: Math.round((subtotal + gst) * 100) / 100 }
  }, [form.lineItems])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const lineItems = form.lineItems.filter((li) => li.product)
    const record = {
      company: form.company,
      items: lineItems.length,
      total: totals.total,
      validUntil: form.validUntil,
      status: form.status,
      lineItems,
      quoteNo: `QT-2026-${String(120 + quotations.length).padStart(4, '0')}`,
    }
    try {
      await api.quotations.insert(record)
      setShowModal(false)
      setForm(emptyForm())
      refresh()
    } catch (err) {
      alert('Could not save quotation: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle={`${quotations.length} quote${quotations.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Quotations"
              headers={['Quote #', 'Company', 'Items', 'Total', 'Valid Until', 'Status']}
              rows={filtered.map((q) => [q.quoteNo, q.company, q.items, `₹${Number(q.total).toLocaleString('en-IN')}`, q.validUntil, q.status])}
              count={filtered.length}
            />
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <IconPlus width={15} height={15} /> New Quotation
            </button>
          </div>
        }
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quote #, company…" />
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Quote #</th><th>Company</th><th>Items</th><th>Total</th><th>Valid Until</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={7}>Loading quotations…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={7}>{quotations.length === 0 ? 'No quotations yet.' : 'No quotations match your search.'}</td></tr>
            ) : filtered.map((q) => (
              <tr key={q.id}>
                <td className="cell-mono">{q.quoteNo}</td>
                <td className="cell-strong">{q.company}</td>
                <td>{q.items}</td>
                <td className="cell-mono">{fmt(q.total)}</td>
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
            {/* Company */}
            <div className="field">
              <label>Company</label>
              <input
                required list="quote-customers"
                value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Select or type company name"
              />
              <datalist id="quote-customers">{customerOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </div>

            {/* Line items */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-700)', display: 'block', marginBottom: 8 }}>
                Products
              </label>
              <div style={{ border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-sm)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--paper-0)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-500)', fontSize: 11, borderBottom: '1px solid var(--paper-200)' }}>Product</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-500)', fontSize: 11, borderBottom: '1px solid var(--paper-200)' }}>Qty (kg)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-500)', fontSize: 11, borderBottom: '1px solid var(--paper-200)' }}>Packing Size</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-500)', fontSize: 11, borderBottom: '1px solid var(--paper-200)' }}>Price/kg (₹)</th>
                      <th style={{ padding: '8px 6px', borderBottom: '1px solid var(--paper-200)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineItems.map((li, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--paper-100)' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            list={`ql-products-${i}`}
                            value={li.product}
                            onChange={(e) => updateLineItem(i, { product: e.target.value })}
                            placeholder="Select product…"
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12.5, background: 'transparent' }}
                          />
                          <datalist id={`ql-products-${i}`}>{productOptions.map((p) => <option key={p} value={p} />)}</datalist>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0" value={li.qty} onChange={(e) => updateLineItem(i, { qty: e.target.value })}
                            style={{ width: 70, border: 'none', outline: 'none', fontSize: 12.5, background: 'transparent' }} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input value={li.packingSize} onChange={(e) => updateLineItem(i, { packingSize: e.target.value })}
                            placeholder="e.g. 25 kg bag"
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12.5, background: 'transparent' }} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0" value={li.price} onChange={(e) => updateLineItem(i, { price: e.target.value })}
                            style={{ width: 80, border: 'none', outline: 'none', fontSize: 12.5, background: 'transparent' }} />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button type="button" className="btn btn-ghost btn-sm btn-danger"
                            onClick={() => removeLineItem(i)} disabled={form.lineItems.length === 1}>
                            <IconTrash width={13} height={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem} style={{ marginTop: 8 }}>
                <IconPlus width={13} height={13} /> Add product
              </button>
            </div>

            {/* Totals */}
            <div style={{ background: 'var(--paper-50)', border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>Subtotal</span>
                <span className="mono">{fmt(totals.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>GST (18%)</span>
                <span className="mono">{fmt(totals.gst)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total</span>
                <span className="mono">{fmt(totals.total)}</span>
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
