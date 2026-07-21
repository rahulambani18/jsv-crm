import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { INDUSTRY_OPTIONS, INDIAN_STATES } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Modal from '../components/Modal.jsx'
import TallyImportButton from '../components/TallyImportButton.jsx'
import Pill from '../components/Pill.jsx'
import SendButtons from '../components/SendButtons.jsx'
import CustomerTimelineModal from '../components/CustomerTimelineModal.jsx'
import { IconPlus, IconSearch, IconTrash, IconEdit } from '../components/Icons.jsx'
import ComboField from '../components/ComboField.jsx'
import Dropdown from '../components/Dropdown.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import { outstandingForCustomer } from '../lib/credit.js'
import { templates } from '../lib/messaging.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'

function emptyForm() {
  return {
    company: '', contact: '', mobile: '', email: '', gst: '',
    businessType: '', industry: '', application: '',
    city: '', state: '', billingAddress: '', shippingAddress: '',
    creditLimit: '',
  }
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export default function Customers() {
  const { can } = useAuth()
  const canEdit = can('customers', 'edit')
  const canDelete = can('customers', 'delete')
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [leads, setLeads] = useState([])
  const [samples, setSamples] = useState([])
  const [quotations, setQuotations] = useState([])
  const [orders, setOrders] = useState([])
  const [meetings, setMeetings] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [timelineFor, setTimelineFor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [users, setUsers] = useState([])

  useEffect(() => { refresh() }, [])
  useEffect(() => { api.users.list().then(setUsers).catch(() => {}) }, [])

  function refresh() {
    setLoading(true)
    Promise.all([
      api.customers.list(), api.invoices.list(), api.payments.list(),
      api.leads.list(), api.samples.list(), api.quotations.list(),
      api.orders.list(), api.meetings.list(), api.followUps.list(),
    ]).then(([c, inv, pay, l, s, q, o, m, f]) => {
      setCustomers(c); setInvoices(inv); setPayments(pay)
      setLeads(l); setSamples(s); setQuotations(q); setOrders(o); setMeetings(m); setFollowUps(f)
      setLoading(false)
    })
  }

  // Outstanding balance per customer, computed live from invoices +
  // payments — never stored, so it's always current.
  const outstandingByCompany = useMemo(() => {
    const map = {}
    customers.forEach((c) => { map[c.company] = outstandingForCustomer(c.company, invoices, payments) })
    return map
  }, [customers, invoices, payments])

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
    showToast(`Imported ${imported} customers from Tally successfully`)
    refresh()
  }

  const filtered = useMemo(() => {
    return customers.filter((c) => !search || [c.company, c.contact, c.mobile, c.gst, c.city].some((v) => (v || '').toLowerCase().includes(search.toLowerCase())))
  }, [customers, search])

  function openEdit(customer) {
    setEditingId(customer.id)
    setForm({ ...emptyForm(), ...customer, creditLimit: customer.creditLimit ?? '' })
    setSameAsBilling(customer.billingAddress === customer.shippingAddress)
    setShowModal(true)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setSameAsBilling(true)
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const record = {
      ...form,
      creditLimit: Number(form.creditLimit) || 0,
      shippingAddress: sameAsBilling ? form.billingAddress : form.shippingAddress,
    }
    try {
      if (editingId) {
        await api.customers.update(editingId, record)
        showToast('Customer updated successfully')
      } else {
        record.code = `CUST-${String(customers.length + 1).padStart(4, '0')}`
        record.added = new Date().toISOString().slice(0, 10)
        await api.customers.insert(record)
        showToast('Customer created successfully')
      }
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      setSameAsBilling(true)
      refresh()
    } catch (err) {
      showToast('Could not save customer: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(customer) {
    if (!confirm(`Delete "${customer.company}"? This cannot be undone.`)) return
    try {
      await api.customers.remove(customer.id)
      refresh()
      showToast(`Customer "${customer.company}" deleted`)
    } catch (err) {
      showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error')
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
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))
    )
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} customer${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.customers.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} customer${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected customers: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((c) => selected.has(c.id))
    exportCSV(
      'Customers',
      ['Code', 'Company', 'Contact', 'Mobile', 'Email', 'City', 'State', 'GST', 'Industry', 'Application'],
      rows.map((c) => [c.code, c.company, c.contact, c.mobile, c.email, c.city, c.state, c.gst, c.industry, c.application])
    )
  }

  async function handleBulkAssign(repName) {
    if (!repName) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.customers.update(id, { assignedTo: repName })))
      setSelected(new Set())
      refresh()
      showToast(`${count} customer${count === 1 ? '' : 's'} assigned to ${repName}`)
    } catch (err) {
      showToast('Could not assign: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleBulkBusinessType(type) {
    if (!type) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.customers.update(id, { businessType: type })))
      setSelected(new Set())
      refresh()
      showToast(`Business type updated for ${count} customer${count === 1 ? '' : 's'}`)
    } catch (err) {
      showToast('Could not update: ' + (err.message || 'Unknown error'), 'error')
    }
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
              <button className="btn btn-primary" onClick={openCreate}>
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

      {canEdit && (
        <BulkActionsBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onExport={handleBulkExport}
          onDelete={canDelete ? handleBulkDelete : undefined}
        >
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkAssign(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Assign to…</option>
            {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkBusinessType(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Set type…</option>
            <option value="Trader">Trader</option>
            <option value="Manufacturer">Manufacturer</option>
            <option value="Both">Both</option>
          </select>
        </BulkActionsBar>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {canEdit && (
                <th className="header-checkbox-cell">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th>Code</th><th>Company</th><th>Contact</th><th>City</th><th>GST</th>
              <th>Type</th><th>Industry</th><th>Application</th><th>Credit Limit</th><th>Outstanding</th>{(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={10 + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)}>Loading customers…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={10 + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)}>
                {customers.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    title="No customers yet"
                    subtitle="Add your first customer to start tracking their orders and account details."
                    actionLabel={canEdit ? 'New Customer' : undefined}
                    onAction={canEdit ? openCreate : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No customers match your search" subtitle="Try adjusting your search." />
                )}
              </td></tr>
            ) : filtered.map((c) => {
              const outstanding = outstandingByCompany[c.company] || 0
              const overLimit = Number(c.creditLimit) > 0 && outstanding > Number(c.creditLimit)
              const t = templates.paymentReminder(c.company, outstanding)
              return (
              <tr key={c.id}>
                {canEdit && (
                  <td className="row-checkbox-cell">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} />
                  </td>
                )}
                <td className="cell-mono">{c.code}</td>
                <td className="cell-strong">{c.company}</td>
                <td>{c.contact}<br /><span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{c.mobile}</span></td>
                <td>{c.city}</td>
                <td className="cell-mono" style={{ fontSize: 11.5 }}>{c.gst}</td>
                <td>{c.businessType ? <span className="pill pill-navy">{c.businessType}</span> : <span className="cell-muted">—</span>}</td>
                <td>{c.industry}</td>
                <td>{c.application}</td>
                <td className="cell-mono">{c.creditLimit ? formatINR(c.creditLimit) : <span className="cell-muted">—</span>}</td>
                <td className="cell-mono">
                  {formatINR(outstanding)}
                  {overLimit && <><br /><Pill tone="red">Over limit</Pill></>}
                </td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} title="Edit"><IconEdit width={13} height={13} /></button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => setTimelineFor(c)} title="View activity timeline">🕘</button>
                      <SendButtons phone={c.mobile} email={c.email} whatsappMessage={t.whatsapp} mailSubject={t.subject} mailBody={t.body} />
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(c)}><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Edit Customer' : 'New Customer'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="customer-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save customer'}
              </button>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleSave}>
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
                <label>Business type</label>
                <Dropdown
                  options={['Trader', 'Manufacturer', 'Both']}
                  value={form.businessType}
                  onChange={(v) => setForm({ ...form, businessType: v })}
                  placeholder="Select type…"
                />
              </div>
              <div className="field">
                <label>Industry</label>
                <ComboField options={INDUSTRY_OPTIONS} value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} placeholder="Select industry…" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Application</label>
                <input value={form.application} onChange={(e) => setForm({ ...form, application: e.target.value })} placeholder="e.g. Flavoured Milk" />
              </div>
              <div className="field">
                <label>Credit limit (₹)</label>
                <input type="number" min="0" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} placeholder="e.g. 500000" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="field">
                <label>State</label>
                <Dropdown
                  options={INDIAN_STATES}
                  value={form.state}
                  onChange={(v) => setForm({ ...form, state: v })}
                  placeholder="Select state…"
                />
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

      {timelineFor && (
        <CustomerTimelineModal
          customer={timelineFor}
          data={{ leads, samples, quotations, orders, invoices, payments, meetings, followUps }}
          onClose={() => setTimelineFor(null)}
        />
      )}
    </div>
  )
}
