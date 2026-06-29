import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconSearch } from '../components/Icons.jsx'
import '../styles/components.css'

function emptyForm() {
  return { code: '', company: '', contact: '', city: '', gst: '', industry: '', application: '', products: '', qty: '' }
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    api.customers.list().then((data) => { setCustomers(data); setLoading(false) })
  }

  const filtered = useMemo(() => {
    return customers.filter((c) => !search || [c.company, c.contact, c.city, c.gst].some((v) => (v || '').toLowerCase().includes(search.toLowerCase())))
  }, [customers, search])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const record = {
      ...form,
      code: form.code || `CUST-${String(customers.length + 1).padStart(4, '0')}`,
      products: form.products.split(',').map((s) => s.trim()).filter(Boolean),
      added: new Date().toISOString().slice(0, 10),
    }
    await api.customers.insert(record)
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm())
    refresh()
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length === 1 ? '' : 's'}`}
        actions={
          <>
            <button className="btn btn-secondary">Template</button>
            <button className="btn btn-secondary">Import Excel/CSV</button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <IconPlus width={15} height={15} /> New Customer
            </button>
          </>
        }
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search company, contact, mobile, GST, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th><th>Company</th><th>Contact</th><th>City</th><th>GST</th>
              <th>Industry</th><th>Application</th><th>Products</th><th>Qty</th><th>Added</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={10}>Loading customers…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={10}>{customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'}</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id}>
                <td className="cell-mono">{c.code}</td>
                <td className="cell-strong">{c.company}</td>
                <td>{c.contact}</td>
                <td>{c.city}</td>
                <td className="cell-mono" style={{ fontSize: 11.5 }}>{c.gst}</td>
                <td>{c.industry}</td>
                <td>{c.application}</td>
                <td>{(c.products || []).join(', ')}</td>
                <td className="cell-mono">{c.qty}</td>
                <td className="cell-mono">{c.added}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title="New Customer"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="customer-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save customer'}
              </button>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleCreate}>
            <div className="field">
              <label>Company name</label>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Contact person</label>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>GST number</label>
                <input value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} />
              </div>
              <div className="field">
                <label>Industry</label>
                <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Application</label>
                <input value={form.application} onChange={(e) => setForm({ ...form, application: e.target.value })} />
              </div>
              <div className="field">
                <label>Monthly qty</label>
                <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="e.g. 2.4 MT/mo" />
              </div>
            </div>
            <div className="field">
              <label>Products (comma separated)</label>
              <input value={form.products} onChange={(e) => setForm({ ...form, products: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
