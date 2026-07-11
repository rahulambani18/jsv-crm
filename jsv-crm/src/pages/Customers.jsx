import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { INDUSTRY_OPTIONS, INDIAN_STATES } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Modal from '../components/Modal.jsx'
import TallyImportButton from '../components/TallyImportButton.jsx'
import { IconPlus, IconSearch } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import '../styles/components.css'

function emptyForm() {
  return {
    company: '', contact: '', mobile: '', email: '', gst: '',
    industry: '', application: '',
    city: '', state: '', billingAddress: '', shippingAddress: '',
  }
}

export default function Customers() {
  const { can } = useAuth()
  const canEdit = can('customers', 'edit')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    api.customers.list().then((c) => { setCustomers(c); setLoading(false) })
  }

  async function handleTallyImport(records) {
    let imported = 0
    for (const r of records) {
      try {
        await api.customers.insert({
          ...r,
          code: `CUST-${String(customers.length + imported + 1).padStart(4, '0')}`,
        })
        imported++
      } catch {}
    }
    alert(`✅ Imported ${imported} customers from Tally successfully!`)
    refresh()
  }

  const filtered = useMemo(() => {
    return customers.filter((c) => !search || [c.company, c.contact, c.mobile, c.gst, c.city].some((v) => (v || '').toLowerCase().includes(search.toLowerCase())))
  }, [customers, search])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const record = {
      ...form,
      code: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
      shippingAddress: sameAsBilling ? form.billingAddress : form.shippingAddress,
      added: new Date().toISOString().slice(0, 10),
    }
    await api.customers.insert(record)
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm())
    setSameAsBilling(true)
    refresh()
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length === 1 ? '' : 's'}`}
        actions={
          canEdit && (
            <>
              <TallyImportButton onImport={handleTallyImport} />
              <ExportBar
                title="Customers"
                headers={['Code', 'Company', 'Contact', 'Mobile', 'Email', 'City', 'State', 'GST', 'Industry', 'Application']}
                rows={filtered.map((c) => [c.code, c.company, c.contact, c.mobile, c.email, c.city, c.state, c.gst, c.industry, c.application])}
                count={filtered.length}
              />
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <IconPlus width={15} height={15} /> New Customer
              </button>
            </>
          )
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
              <th>Industry</th><th>Application</th><th>Added</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={8}>Loading customers…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={8}>{customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'}</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id}>
                <td className="cell-mono">{c.code}</td>
                <td className="cell-strong">{c.company}</td>
                <td>{c.contact}<br /><span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{c.mobile}</span></td>
                <td>{c.city}</td>
                <td className="cell-mono" style={{ fontSize: 11.5 }}>{c.gst}</td>
                <td>{c.industry}</td>
                <td>{c.application}</td>
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
                <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="field">
                <label>Mobile</label>
                <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+91 90000 00000" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>GST number</label>
                <input value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Industry</label>
                <ComboField options={INDUSTRY_OPTIONS} value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} placeholder="Select industry…" />
              </div>
              <div className="field">
                <label>Application</label>
                <input value={form.application} onChange={(e) => setForm({ ...form, application: e.target.value })} placeholder="e.g. Flavoured Milk" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="field">
                <label>State</label>
                <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                  <option value="" disabled>Select state…</option>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Billing address</label>
              <textarea rows={2} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} style={{ width: 'auto' }} />
                Shipping address same as billing
              </label>
            </div>
            {!sameAsBilling && (
              <div className="field">
                <label>Shipping address</label>
                <textarea rows={2} value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} />
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
