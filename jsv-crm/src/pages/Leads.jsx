import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { PIPELINE_STAGES, INDUSTRY_OPTIONS, INDIAN_STATES } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ComboField from '../components/ComboField.jsx'
import MultiComboField from '../components/MultiComboField.jsx'
import Dropdown from '../components/Dropdown.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import RowActionsMenu from '../components/RowActionsMenu.jsx'
import SendButtons from '../components/SendButtons.jsx'
import Pagination from '../components/Pagination.jsx'
import { IconPlus, IconSearch, IconTrash } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import { findDuplicate, duplicateMessage } from '../lib/duplicateCheck.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import ClearFiltersButton from '../components/ClearFiltersButton.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'

const STATUSES = ['All statuses', ...PIPELINE_STAGES]
const PRIORITY_FILTERS = ['All priorities', 'High', 'Medium', 'Low']

const LEAD_COLUMNS = [
  { key: 'id', label: 'Lead' },
  { key: 'company', label: 'Company' },
  { key: 'contact', label: 'Contact' },
  { key: 'city', label: 'City' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'estValue', label: 'Est. Value' },
  { key: 'nextFollowUp', label: 'Next Follow-up' },
]

function emptyForm() {
  return { company: '', contact: '', phone: '', city: '', priority: 'Medium', status: 'New Lead', estValue: '', nextFollowUp: '', industry: '', products: [] }
}

// Maps a lead's fields onto the Customer shape — anything Customers
// tracks that Leads don't (GST, business type, state, addresses) is
// left blank for the rep to fill in on the conversion modal.
function customerFormFromLead(lead) {
  return {
    company: lead.company || '', contact: lead.contact || '', mobile: lead.phone || '',
    email: lead.email || '', gst: '', businessType: '', industry: lead.industry || '',
    application: '', city: lead.city || '', state: '', billingAddress: '', shippingAddress: '',
  }
}

export default function Leads() {
  const { can } = useAuth()
  const canEdit = can('leads', 'edit')
  const canDelete = can('leads', 'delete')
  const [leads, setLeads] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCols, setVisibleCols] = useState(LEAD_COLUMNS.map((c) => c.key))
  const [searchParams] = useSearchParams()
  const [search, setSearch, searchMeta] = usePersistedFilter('jsv_filter_leads_search', searchParams.get('q'), '')
  const [statusFilter, setStatusFilter, statusMeta] = usePersistedFilter('jsv_filter_leads_status', searchParams.get('status'), 'All statuses')
  const [priorityFilter, setPriorityFilter, priorityMeta] = usePersistedFilter('jsv_filter_leads_priority', searchParams.get('priority'), 'All priorities')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [users, setUsers] = useState([])
  const [convertLead, setConvertLead] = useState(null)
  const [convertForm, setConvertForm] = useState(null)
  const [convertSameAsBilling, setConvertSameAsBilling] = useState(true)
  const [converting, setConverting] = useState(false)

  useEffect(() => { refresh() }, [])
  useEffect(() => { api.users.list().then(setUsers).catch(() => {}) }, [])
  useEffect(() => { api.customers.list().then(setCustomers).catch(() => {}) }, [])
  useAutoRefresh(() => refresh(true), 60000)

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([api.leads.list(), api.products.list()]).then(([l, p]) => {
      setLeads(l); setProducts(p); setLoading(false)
    })
  }

  const productOptions = useMemo(() => products.map((p) => p.name), [products])

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch = !search || [l.company, l.contact, l.phone, l.city].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
      const matchesStatus = statusFilter === 'All statuses' || l.status === statusFilter
      const matchesPriority = priorityFilter === 'All priorities' || l.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [leads, search, statusFilter, priorityFilter])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search, statusFilter, priorityFilter])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  const duplicateWarning = useMemo(
    () => findDuplicate(form, [{ records: leads, label: 'lead' }, { records: customers, label: 'customer' }], null),
    [form, leads, customers]
  )

  async function handleCreate(e) {
    e.preventDefault()
    if (duplicateWarning && !confirm(`${duplicateMessage(duplicateWarning)} Save anyway?`)) return
    setSaving(true)
    const record = { ...form, estValue: Number(form.estValue) || 0 }
    try {
      await api.leads.insert(record)
      setShowModal(false)
      setForm(emptyForm())
      refresh()
    } catch (err) {
      alert('Could not save lead: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(lead) {
    if (!confirm(`Delete lead "${lead.company}"? This cannot be undone.`)) return
    try {
      await api.leads.remove(lead.id)
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
      prev.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id))
    )
  }

  function openConvert(lead) {
    setConvertLead(lead)
    setConvertForm(customerFormFromLead(lead))
    setConvertSameAsBilling(true)
    setConverting(false)
  }

  // The company name is what actually links a lead to a customer here
  // (there's no separate customerId column) — a lead whose company
  // already matches an existing customer is treated as converted, in
  // addition to whatever came back from an in-app conversion. This
  // catches customers created some other way too (import, manual entry).
  const convertedCompanies = useMemo(
    () => new Set(customers.map((c) => (c.company || '').trim().toLowerCase())),
    [customers]
  )
  function isConverted(lead) {
    return lead.status === 'Converted Customer' || convertedCompanies.has((lead.company || '').trim().toLowerCase())
  }

  const convertDuplicate = useMemo(
    () => (convertForm ? findDuplicate(convertForm, [{ records: customers, label: 'customer' }], null) : null),
    [convertForm, customers]
  )

  async function handleConvertSubmit(e) {
    e.preventDefault()
    if (convertDuplicate && !confirm(`${duplicateMessage(convertDuplicate)} Save anyway?`)) return
    setConverting(true)
    const record = {
      ...convertForm,
      shippingAddress: convertSameAsBilling ? convertForm.billingAddress : convertForm.shippingAddress,
      code: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
      added: new Date().toISOString().slice(0, 10),
    }
    try {
      await api.customers.insert(record)
      await api.leads.update(convertLead.id, { status: 'Converted Customer' })
      showToast(`${convertLead.company} converted to a customer`)
      setConvertLead(null)
      setConvertForm(null)
      const [c] = await Promise.all([api.customers.list()])
      setCustomers(c)
      refresh()
    } catch (err) {
      showToast('Could not convert lead: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setConverting(false)
    }
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} lead${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.leads.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} lead${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected leads: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((l) => selected.has(l.id))
    exportCSV(
      'Leads',
      ['Company', 'Contact', 'Phone', 'City', 'Priority', 'Status', 'Est. Value', 'Next Follow-up', 'Industry'],
      rows.map((l) => [l.company, l.contact, l.phone, l.city, l.priority, l.status, l.estValue, l.nextFollowUp, l.industry])
    )
  }

  async function handleBulkAssign(repName) {
    if (!repName) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.leads.update(id, { assignedTo: repName })))
      setSelected(new Set())
      refresh()
      showToast(`${count} lead${count === 1 ? '' : 's'} assigned to ${repName}`)
    } catch (err) {
      showToast('Could not assign: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleBulkStatus(status) {
    if (!status) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.leads.update(id, { status })))
      setSelected(new Set())
      refresh()
      showToast(`Pipeline stage updated to "${status}" for ${count} lead${count === 1 ? '' : 's'}`)
    } catch (err) {
      showToast('Could not update status: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleBulkPriority(priority) {
    if (!priority) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.leads.update(id, { priority })))
      setSelected(new Set())
      refresh()
      showToast(`Priority set to "${priority}" for ${count} lead${count === 1 ? '' : 's'}`)
    } catch (err) {
      showToast('Could not update priority: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={leads.length === 0 ? 'No leads yet' : `${leads.length} lead${leads.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Leads"
              headers={['Company', 'Contact', 'Phone', 'City', 'Priority', 'Status', 'Est. Value', 'Next Follow-up', 'Industry']}
              rows={filtered.map((l) => [l.company, l.contact, l.phone, l.city, l.priority, l.status, l.estValue, l.nextFollowUp, l.industry])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <IconPlus width={15} height={15} /> New Lead
              </button>
            )}
          </div>
        }
      />

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search company, contact, phone, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select-input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          {PRIORITY_FILTERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <ColumnChooser columns={LEAD_COLUMNS} storageKey="jsv_cols_leads" onChange={setVisibleCols} />
        <ClearFiltersButton
          filters={[searchMeta, statusMeta, priorityMeta]}
          onClear={() => { searchMeta.clear(); statusMeta.clear(); priorityMeta.clear() }}
        />
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
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkStatus(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Change stage…</option>
            {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="btn btn-ghost-light" defaultValue="" onChange={(e) => { handleBulkPriority(e.target.value); e.target.value = '' }}>
            <option value="" disabled>Set priority…</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </BulkActionsBar>
      )}

      <div className="table-wrap sticky-first-col">
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
              {visibleCols.map((key) => (
                <th key={key}>{LEAD_COLUMNS.find((c) => c.key === key)?.label}</th>
              ))}
              {(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={visibleCols.length + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)} rows={6} />
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + (canEdit ? 1 : 0) + ((canEdit || canDelete) ? 1 : 0)}>
                {leads.length === 0 ? (
                  <EmptyState
                    icon="🎯"
                    title="No leads yet"
                    subtitle="Add your first lead to start building your pipeline."
                    actionLabel={canEdit ? 'New Lead' : undefined}
                    onAction={canEdit ? () => setShowModal(true) : undefined}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No leads match your filters" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : paged.map((l) => {
              const cell = (key) => {
                switch (key) {
                  case 'id': return <td key={key} className="cell-mono cell-muted">{l.id.toUpperCase()}</td>
                  case 'company': return <td key={key} className="cell-strong">{l.company}</td>
                  case 'contact': return <td key={key}>{l.contact}<br /><span className="cell-mono cell-muted" style={{ fontSize: 11.5 }}>{l.phone}</span></td>
                  case 'city': return <td key={key}>{l.city}</td>
                  case 'priority': return <td key={key}><Pill>{l.priority}</Pill></td>
                  case 'status': return <td key={key}><Pill>{l.status}</Pill></td>
                  case 'estValue': return <td key={key} className="cell-mono">₹{Number(l.estValue).toLocaleString('en-IN')}</td>
                  case 'nextFollowUp': return <td key={key} className="cell-mono">{l.nextFollowUp}</td>
                  default: return null
                }
              }
              return (
              <tr key={l.id}>
                {canEdit && (
                  <td className="row-checkbox-cell">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelected(l.id)} />
                  </td>
                )}
                {visibleCols.map((key) => cell(key))}
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <SendButtons
                        phone={l.phone}
                        email={l.email}
                        whatsappMessage={`Hi ${l.contact || ''}, this is JSV Ingredient reaching out regarding ${(l.products || []).join(', ') || 'your enquiry'}. Let us know how we can help!`}
                        mailSubject={`Following up — ${l.company}`}
                        mailBody={`Dear ${l.contact || l.company},\n\nFollowing up on your enquiry with JSV Ingredient.\n\nRegards,\nJSV Ingredient`}
                      />
                      <RowActionsMenu
                        items={[
                          canEdit && can('customers', 'edit') && {
                            label: isConverted(l) ? 'Already a customer' : 'Convert to Customer',
                            icon: '🤝',
                            disabled: isConverted(l),
                            disabledReason: 'This company is already a customer',
                            onClick: () => openConvert(l),
                          },
                          canDelete && 'divider',
                          canDelete && { label: 'Delete', icon: <IconTrash width={13} height={13} />, danger: true, onClick: () => handleDelete(l) },
                        ].filter(Boolean)}
                      />
                    </div>
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />

      {showModal && (
        <Modal
          title="New Lead"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="lead-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save lead'}
              </button>
            </>
          }
        >
          <form id="lead-form" onSubmit={handleCreate}>
            <div className="field">
              <label>Company name</label>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Patel Agro Industries" />
            </div>
            {duplicateWarning && (
              <div style={{
                background: 'var(--amber-50, #fff8e6)', border: '1px solid var(--amber-600)', borderRadius: 'var(--radius-sm)',
                padding: '8px 10px', fontSize: 12.5, color: 'var(--amber-700, #92400e)', marginBottom: 12,
              }}>
                ⚠ {duplicateMessage(duplicateWarning)}
              </div>
            )}
            <div className="field-row">
              <div className="field">
                <label>Contact person</label>
                <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 90000 00000" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="field">
                <label>Industry</label>
                <ComboField
                  options={INDUSTRY_OPTIONS}
                  value={form.industry}
                  onChange={(v) => setForm({ ...form, industry: v })}
                  placeholder="Select industry…"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div className="field">
                <label>Pipeline stage</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Est. value (₹)</label>
                <input type="number" min="0" value={form.estValue} onChange={(e) => setForm({ ...form, estValue: e.target.value })} />
              </div>
              <div className="field">
                <label>Next follow-up</label>
                <input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Products of interest</label>
              <MultiComboField
                options={productOptions}
                value={form.products}
                onChange={(v) => setForm({ ...form, products: v })}
                placeholder="Select a product…"
              />
            </div>
          </form>
        </Modal>
      )}

      {convertLead && convertForm && (
        <Modal
          title={`Convert "${convertLead.company}" to Customer`}
          onClose={() => { setConvertLead(null); setConvertForm(null) }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setConvertLead(null); setConvertForm(null) }}>Cancel</button>
              <button className="btn btn-primary" form="convert-lead-form" type="submit" disabled={converting}>
                {converting ? 'Converting…' : 'Create customer'}
              </button>
            </>
          }
        >
          <form id="convert-lead-form" onSubmit={handleConvertSubmit}>
            <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 0, marginBottom: 14 }}>
              This creates a new customer record from this lead's details and marks the lead as "Converted Customer".
              Fill in anything Customers tracks that this lead doesn't have yet.
            </p>
            <div className="field">
              <label>Company name</label>
              <input required value={convertForm.company} onChange={(e) => setConvertForm({ ...convertForm, company: e.target.value })} />
            </div>
            {convertDuplicate && (
              <div style={{
                background: 'var(--amber-50, #fff8e6)', border: '1px solid var(--amber-600)', borderRadius: 'var(--radius-sm)',
                padding: '8px 10px', fontSize: 12.5, color: 'var(--amber-700, #92400e)', marginBottom: 12,
              }}>
                ⚠ {duplicateMessage(convertDuplicate)}
              </div>
            )}
            <div className="field-row">
              <div className="field">
                <label>Contact person</label>
                <input required value={convertForm.contact} onChange={(e) => setConvertForm({ ...convertForm, contact: e.target.value })} />
              </div>
              <div className="field">
                <label>Mobile</label>
                <input value={convertForm.mobile} onChange={(e) => setConvertForm({ ...convertForm, mobile: e.target.value })} placeholder="+91 90000 00000" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Email</label>
                <input type="email" value={convertForm.email} onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })} />
              </div>
              <div className="field">
                <label>GST number</label>
                <input value={convertForm.gst} onChange={(e) => setConvertForm({ ...convertForm, gst: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Business type</label>
                <Dropdown
                  options={['Trader', 'Manufacturer', 'Both']}
                  value={convertForm.businessType}
                  onChange={(v) => setConvertForm({ ...convertForm, businessType: v })}
                  placeholder="Select type…"
                />
              </div>
              <div className="field">
                <label>Industry</label>
                <ComboField options={INDUSTRY_OPTIONS} value={convertForm.industry} onChange={(v) => setConvertForm({ ...convertForm, industry: v })} placeholder="Select industry…" />
              </div>
            </div>
            <div className="field">
              <label>Application</label>
              <input value={convertForm.application} onChange={(e) => setConvertForm({ ...convertForm, application: e.target.value })} placeholder="e.g. Flavoured Milk" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>City</label>
                <input value={convertForm.city} onChange={(e) => setConvertForm({ ...convertForm, city: e.target.value })} />
              </div>
              <div className="field">
                <label>State</label>
                <Dropdown
                  options={INDIAN_STATES}
                  value={convertForm.state}
                  onChange={(v) => setConvertForm({ ...convertForm, state: v })}
                  placeholder="Select state…"
                />
              </div>
            </div>
            <div className="field">
              <label>Billing address</label>
              <textarea rows={2} value={convertForm.billingAddress} onChange={(e) => setConvertForm({ ...convertForm, billingAddress: e.target.value })} />
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={convertSameAsBilling} onChange={(e) => setConvertSameAsBilling(e.target.checked)} style={{ width: 'auto' }} />
                Shipping address same as billing
              </label>
            </div>
            {!convertSameAsBilling && (
              <div className="field">
                <label>Shipping address</label>
                <textarea rows={2} value={convertForm.shippingAddress} onChange={(e) => setConvertForm({ ...convertForm, shippingAddress: e.target.value })} />
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
