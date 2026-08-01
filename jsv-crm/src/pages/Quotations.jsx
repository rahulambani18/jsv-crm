import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { WAREHOUSES, GST_RATE, calcOrderTotals } from '../data/seed.js'
import PageHeader from '../components/PageHeader.jsx'
import ExportBar from '../components/ExportBar.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import SendButtons from '../components/SendButtons.jsx'
import Pagination from '../components/Pagination.jsx'
import RowActionsMenu from '../components/RowActionsMenu.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import BulkSendModal from '../components/BulkSendModal.jsx'
import ComboField from '../components/ComboField.jsx'
import Dropdown from '../components/Dropdown.jsx'
import { IconPlus, IconTrash, IconSearch, IconEdit } from '../components/Icons.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { exportCSV } from '../lib/exportUtils.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'
import TableSkeleton from '../components/TableSkeleton.jsx'
import ColumnChooser from '../components/ColumnChooser.jsx'
import ClearFiltersButton from '../components/ClearFiltersButton.jsx'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'

const QUOTATION_COLUMNS = [
  { key: 'quoteNo', label: 'Quote #' },
  { key: 'company', label: 'Company' },
  { key: 'items', label: 'Items' },
  { key: 'total', label: 'Total' },
  { key: 'validUntil', label: 'Valid Until' },
  { key: 'status', label: 'Status' },
]

function emptyLineItem() {
  return { product: '', qty: '', packingSize: '', price: '' }
}

function emptyForm() {
  return { company: '', validUntil: '', status: 'Draft', lineItems: [emptyLineItem()] }
}

function addDays(dateStr, days) {
  if (!dateStr || days == null) return ''
  return new Date(new Date(dateStr).getTime() + days * 86400000).toISOString().slice(0, 10)
}

// Quotation line items track packingSize (no unit/uom); Orders track
// unit + lineTotal instead. Carries product/qty/price across and fills
// in sane order-side defaults for the rest.
function orderLineItemsFromQuote(lineItems) {
  return (lineItems || []).map((li) => ({
    product: li.product, qty: li.qty, unit: 'kg', unitPrice: li.price,
  }))
}

function emptyConvertForm(q, customers) {
  const customer = customers.find((c) => c.company === q.company)
  const today = new Date().toISOString().slice(0, 10)
  return {
    customerId: customer?.id || '', company: q.company, warehouse: WAREHOUSES[0],
    orderDate: today, delivery: '', paymentTerms: 'Net 30', paymentDueDate: addDays(today, 30),
    poNumber: '', poDate: today, deliveryCharge: 0,
    lineItems: orderLineItemsFromQuote(q.lineItems),
  }
}

export default function Quotations() {
  const { can } = useAuth()
  const canEdit = can('quotations', 'edit')
  const canDelete = can('quotations', 'delete')
  const [searchParams] = useSearchParams()
  const [search, setSearch, searchMeta] = usePersistedFilter('jsv_filter_quotations_search', searchParams.get('q'), '')
  const [quotations, setQuotations] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCols, setVisibleCols] = useState(QUOTATION_COLUMNS.map((c) => c.key))
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [sendModal, setSendModal] = useState(null) // 'whatsapp' | 'email' | null
  const [convertQuote, setConvertQuote] = useState(null)
  const [convertForm, setConvertForm] = useState(null)
  const [converting, setConverting] = useState(false)

  useEffect(() => { refresh() }, [])
  useEffect(() => { api.users.list().then(setUsers).catch(() => {}) }, [])
  useEffect(() => { api.invoices.list().then(setInvoices).catch(() => {}) }, [])
  useEffect(() => { api.orders.list().then(setOrders).catch(() => {}) }, [])
  useAutoRefresh(() => refresh(true), 60000)

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([api.quotations.list(), api.products.list(), api.customers.list()]).then(([q, p, c]) => {
      setQuotations(q); setProducts(p); setCustomers(c); setLoading(false)
    })
  }

  const productOptions = useMemo(() => products.map((p) => p.name), [products])
  const customerOptions = useMemo(() => customers.map((c) => c.company), [customers])

  const filtered = useMemo(() => quotations.filter((q) =>
    !search || [q.quoteNo, q.company].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
  ), [quotations, search])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

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
    }
    try {
      if (editingId) {
        await api.quotations.update(editingId, record)
        showToast('Quotation updated successfully')
      } else {
        record.quoteNo = `QT-2026-${String(120 + quotations.length).padStart(4, '0')}`
        await api.quotations.insert(record)
        showToast('Quotation created successfully')
      }
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      refresh()
    } catch (err) {
      showToast('Could not save quotation: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(q) {
    setEditingId(q.id)
    setForm({
      company: q.company || '',
      validUntil: q.validUntil || '',
      status: q.status || 'Draft',
      lineItems: q.lineItems && q.lineItems.length ? q.lineItems : [emptyLineItem()],
    })
    setShowModal(true)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  async function handleDelete(q) {
    if (!confirm(`Delete quotation "${q.quoteNo}" for "${q.company}"? This cannot be undone.`)) return
    try {
      await api.quotations.remove(q.id)
      showToast(`Quotation "${q.quoteNo}" deleted`)
      refresh()
    } catch (err) {
      showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  // A quotation is "converted" once any order carries its id as
  // quoteId — set the same way orders already link back to the
  // invoices generated from them.
  function convertedOrderFor(q) {
    return orders.find((o) => o.quoteId === q.id)
  }

  function openConvert(q) {
    setConvertQuote(q)
    setConvertForm(emptyConvertForm(q, customers))
    setConverting(false)
  }

  function updateConvertLineItem(i, patch) {
    setConvertForm((f) => {
      const items = [...f.lineItems]
      items[i] = { ...items[i], ...patch }
      return { ...f, lineItems: items }
    })
  }
  function addConvertLineItem() {
    setConvertForm((f) => ({ ...f, lineItems: [...f.lineItems, { product: '', qty: '', unit: 'kg', unitPrice: '' }] }))
  }
  function removeConvertLineItem(i) {
    setConvertForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }))
  }

  const convertTotals = useMemo(
    () => (convertForm ? calcOrderTotals(convertForm.lineItems, GST_RATE, convertForm.deliveryCharge) : null),
    [convertForm]
  )

  async function handleConvertSubmit(e) {
    e.preventDefault()
    setConverting(true)
    const lineItems = convertForm.lineItems
      .filter((li) => li.product && Number(li.qty) > 0)
      .map((li) => ({ ...li, lineTotal: Math.round((Number(li.qty) || 0) * (Number(li.unitPrice) || 0) * 100) / 100 }))
    const { subtotal, gstAmount, deliveryCharge, total } = calcOrderTotals(lineItems, GST_RATE, convertForm.deliveryCharge)
    const record = {
      customerId: convertForm.customerId, company: convertForm.company, warehouse: convertForm.warehouse,
      orderDate: convertForm.orderDate, delivery: convertForm.delivery, lineItems,
      subtotal, gstRate: GST_RATE, gstAmount, deliveryCharge, total,
      status: 'Processing', payment: 'Pending',
      paymentTerms: convertForm.paymentTerms, paymentDueDate: convertForm.paymentDueDate,
      poNumber: convertForm.poNumber, poDate: convertForm.poDate || convertForm.orderDate,
      quoteId: convertQuote.id,
      orderNo: `ORD-2026-${String(300 + orders.length + 1).padStart(4, '0')}`,
    }
    if (!record.poNumber) record.poNumber = record.orderNo.replace('ORD-', 'PO-')
    try {
      await api.orders.insert(record)
      showToast(`Order created from quotation ${convertQuote.quoteNo}`)
      setConvertQuote(null)
      setConvertForm(null)
      const o = await api.orders.list()
      setOrders(o)
    } catch (err) {
      showToast('Could not create order: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setConverting(false)
    }
  }

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((q) => q.id))
    )
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} quotation${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.quotations.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} quotation${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected quotations: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((q) => selected.has(q.id))
    exportCSV(
      'Quotations',
      ['Quote #', 'Company', 'Items', 'Total', 'Valid Until', 'Status'],
      rows.map((q) => [q.quoteNo, q.company, q.items, `₹${Number(q.total).toLocaleString('en-IN')}`, q.validUntil, q.status])
    )
  }

  async function handleBulkAssign(repName) {
    if (!repName) return
    const count = selected.size
    try {
      await Promise.all([...selected].map((id) => api.quotations.update(id, { assignedTo: repName })))
      setSelected(new Set())
      refresh()
      showToast(`${count} quotation${count === 1 ? '' : 's'} assigned to ${repName}`)
    } catch (err) {
      showToast('Could not assign: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  // Bulk version of "convert to invoice" — skips quotations that
  // already have a linked invoice (matched via notes on the invoice,
  // same convention Invoices.jsx would use if it tracked quoteId).
  async function handleBulkGenerateInvoice() {
    const targets = filtered.filter((q) => selected.has(q.id))
    if (targets.length === 0) return
    if (!confirm(`Generate ${targets.length} invoice${targets.length === 1 ? '' : 's'} from the selected quotation${targets.length === 1 ? '' : 's'}?`)) return
    try {
      let n = 0
      for (const q of targets) {
        const subtotal = Number(q.total) / 1.18
        const gst = Number(q.total) - subtotal
        await api.invoices.insert({
          invoiceNo: `INV-2026-${String(40 + invoices.length + n + 1).padStart(4, '0')}`,
          company: q.company,
          quoteId: q.id,
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate: q.validUntil || '',
          paymentTerms: 'Net 30',
          subtotal: Math.round(subtotal),
          cgst: Math.round(gst / 2),
          sgst: Math.round(gst / 2),
          igst: 0,
          total: Math.round(Number(q.total)),
          status: 'Draft',
          paymentMode: '',
          notes: `Generated from quotation ${q.quoteNo}`,
        })
        n++
      }
      setSelected(new Set())
      const invs = await api.invoices.list()
      setInvoices(invs)
      showToast(`${n} invoice${n === 1 ? '' : 's'} generated from selected quotations`)
    } catch (err) {
      showToast('Could not generate invoices: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  const sendRows = useMemo(() => filtered.filter((q) => selected.has(q.id)).map((q) => {
    const customer = customers.find((c) => c.company === q.company)
    return {
      key: q.id,
      title: q.company,
      subtitle: `${q.quoteNo} · ${fmt(q.total)}`,
      phone: customer?.mobile,
      email: customer?.email,
      vars: { company: q.company, contact: customer?.contact, quoteNo: q.quoteNo, total: fmt(q.total), validUntil: q.validUntil },
    }
  }), [filtered, selected, customers])

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle={quotations.length === 0 ? 'No quotations yet' : `${quotations.length} quote${quotations.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportBar
              title="Quotations"
              headers={['Quote #', 'Company', 'Items', 'Total', 'Valid Until', 'Status']}
              rows={filtered.map((q) => [q.quoteNo, q.company, q.items, `₹${Number(q.total).toLocaleString('en-IN')}`, q.validUntil, q.status])}
              count={filtered.length}
            />
            <button className="btn btn-primary" onClick={openCreate}>
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
        <ColumnChooser columns={QUOTATION_COLUMNS} storageKey="jsv_cols_quotations" onChange={setVisibleCols} />
        <ClearFiltersButton filters={[searchMeta]} onClear={() => searchMeta.clear()} />
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
          <button type="button" className="btn btn-ghost-light" onClick={() => setSendModal('email')}>✉️ Send Email</button>
          <button type="button" className="btn btn-ghost-light" onClick={() => setSendModal('whatsapp')}>💬 Send WhatsApp</button>
          <button type="button" className="btn btn-ghost-light" onClick={handleBulkGenerateInvoice}>🧾 Generate Invoice</button>
        </BulkActionsBar>
      )}

      <BulkSendModal
        open={!!sendModal}
        onClose={() => setSendModal(null)}
        category="quotation"
        channel={sendModal || 'both'}
        rows={sendRows}
      />

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
                <th key={key}>{QUOTATION_COLUMNS.find((c) => c.key === key)?.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={visibleCols.length + (canEdit ? 1 : 0) + 1} rows={6} />
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={visibleCols.length + (canEdit ? 1 : 0) + 1}>
                {quotations.length === 0 ? (
                  <EmptyState
                    icon="📄"
                    title="No quotations yet"
                    subtitle="Create your first quotation to send a customer pricing and terms."
                    actionLabel="New Quotation"
                    onAction={() => setShowModal(true)}
                  />
                ) : (
                  <EmptyState icon="🔍" title="No quotations match your search" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : paged.map((q) => {
              const customer = customers.find((c) => c.company === q.company)
              const cell = (key) => {
                switch (key) {
                  case 'quoteNo': return <td key={key} className="cell-mono">{q.quoteNo}</td>
                  case 'company': return <td key={key} className="cell-strong">{q.company}</td>
                  case 'items': return <td key={key}>{q.items}</td>
                  case 'total': return <td key={key} className="cell-mono">{fmt(q.total)}</td>
                  case 'validUntil': return <td key={key} className="cell-mono">{q.validUntil}</td>
                  case 'status': return <td key={key}><Pill>{q.status}</Pill></td>
                  default: return null
                }
              }
              return (
              <tr key={q.id}>
                {canEdit && (
                  <td className="header-checkbox-cell">
                    <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleSelected(q.id)} />
                  </td>
                )}
                {visibleCols.map((key) => cell(key))}
                <td style={{ display: 'flex', gap: 4 }}>
                  <SendButtons
                    phone={customer?.mobile}
                    email={customer?.email}
                    category="quotation"
                    vars={{ company: q.company, contact: customer?.contact, quoteNo: q.quoteNo, total: fmt(q.total), validUntil: q.validUntil }}
                  />
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: <IconEdit width={13} height={13} />, onClick: () => openEdit(q) },
                      can('orders', 'edit') && {
                        label: convertedOrderFor(q) ? 'Already converted' : 'Convert to Order',
                        icon: '🛒',
                        disabled: !!convertedOrderFor(q),
                        disabledReason: convertedOrderFor(q) ? `Already converted to order ${convertedOrderFor(q).orderNo}` : undefined,
                        onClick: () => openConvert(q),
                      },
                      'divider',
                      { label: 'Delete', icon: <IconTrash width={13} height={13} />, danger: true, onClick: () => handleDelete(q) },
                    ].filter(Boolean)}
                  />
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1) }} />

      {showModal && (
        <Modal
          title={editingId ? 'Edit Quotation' : 'New Quotation'}
          onClose={() => { setShowModal(false); setEditingId(null) }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingId(null) }}>Cancel</button>
              <button className="btn btn-primary" form="quote-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save quotation'}
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

      {convertQuote && convertForm && (
        <Modal
          title={`Convert "${convertQuote.quoteNo}" to Order`}
          onClose={() => { setConvertQuote(null); setConvertForm(null) }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setConvertQuote(null); setConvertForm(null) }}>Cancel</button>
              <button className="btn btn-primary" form="convert-quote-form" type="submit" disabled={converting}>
                {converting ? 'Creating…' : 'Create order'}
              </button>
            </>
          }
        >
          <form id="convert-quote-form" onSubmit={handleConvertSubmit}>
            <div className="field-row">
              <div className="field">
                <label>Customer</label>
                <select
                  value={convertForm.customerId}
                  onChange={(e) => {
                    const customerId = e.target.value
                    const customer = customers.find((c) => c.id === customerId)
                    setConvertForm((f) => ({ ...f, customerId, company: customer?.company || f.company }))
                  }}
                >
                  <option value="">No matching customer — link later</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Company name</label>
                <input required value={convertForm.company} onChange={(e) => setConvertForm({ ...convertForm, company: e.target.value })} />
              </div>
            </div>
            {!convertForm.customerId && (
              <div style={{
                background: 'var(--amber-50, #fff8e6)', border: '1px solid var(--amber-600)', borderRadius: 'var(--radius-sm)',
                padding: '8px 10px', fontSize: 12.5, color: 'var(--amber-700, #92400e)', marginBottom: 14,
              }}>
                ⚠ No customer record matches "{convertForm.company}" yet. You can still create the order, or convert this company to a customer first.
              </div>
            )}
            <div className="field">
              <label>Warehouse</label>
              <ComboField
                options={WAREHOUSES}
                value={convertForm.warehouse}
                onChange={(v) => setConvertForm({ ...convertForm, warehouse: v })}
                placeholder="Select warehouse…"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Order date</label>
                <input type="date" value={convertForm.orderDate} onChange={(e) => setConvertForm({ ...convertForm, orderDate: e.target.value })} />
              </div>
              <div className="field">
                <label>Expected delivery</label>
                <input type="date" value={convertForm.delivery} onChange={(e) => setConvertForm({ ...convertForm, delivery: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Payment terms</label>
                <Dropdown
                  options={['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom']}
                  value={convertForm.paymentTerms}
                  onChange={(v) => setConvertForm({ ...convertForm, paymentTerms: v })}
                />
              </div>
              <div className="field">
                <label>Purchase order number</label>
                <input value={convertForm.poNumber} onChange={(e) => setConvertForm({ ...convertForm, poNumber: e.target.value })} placeholder="Leave blank to auto-generate" />
              </div>
            </div>

            <div className="field">
              <label>Line items</label>
              <div style={{ border: '1px solid var(--paper-200)', borderRadius: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: 480, fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--paper-0)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 8px', fontWeight: 600, fontSize: 11 }}>Product</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 64 }}>Qty</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 64 }}>Unit</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 90 }}>Unit Price</th>
                      <th style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 600, fontSize: 11, width: 90 }}>Total</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {convertForm.lineItems.map((li, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--paper-100)' }}>
                        <td style={{ padding: 6 }}>
                          <select value={li.product} onChange={(e) => updateConvertLineItem(i, { product: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="">Select product…</option>
                            {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 6 }}>
                          <input type="number" min="0" value={li.qty} onChange={(e) => updateConvertLineItem(i, { qty: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }} />
                        </td>
                        <td style={{ padding: 6 }}>
                          <select value={li.unit} onChange={(e) => updateConvertLineItem(i, { unit: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="MT">MT</option>
                            <option value="L">L</option>
                          </select>
                        </td>
                        <td style={{ padding: 6 }}>
                          <input type="number" min="0" value={li.unitPrice} onChange={(e) => updateConvertLineItem(i, { unitPrice: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }} />
                        </td>
                        <td className="cell-mono" style={{ padding: '6px 8px', textAlign: 'right' }}>
                          {fmt((Number(li.qty) || 0) * (Number(li.unitPrice) || 0))}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeConvertLineItem(i)} disabled={convertForm.lineItems.length === 1}>
                            <IconTrash width={13} height={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addConvertLineItem} style={{ marginTop: 8 }}>
                <IconPlus width={13} height={13} /> Add line item
              </button>
            </div>

            {convertTotals && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--paper-0)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--ink-500)' }}>Subtotal</span>
                  <span className="cell-mono">{fmt(convertTotals.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: 'var(--ink-500)' }}>Delivery charges</span>
                  <input
                    type="number" min="0" value={convertForm.deliveryCharge}
                    onChange={(e) => setConvertForm({ ...convertForm, deliveryCharge: e.target.value })}
                    style={{ width: 110, textAlign: 'right', fontSize: 12.5, padding: '4px 8px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--ink-500)' }}>GST ({GST_RATE}%) on subtotal + delivery</span>
                  <span className="cell-mono">{fmt(convertTotals.gstAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14.5, paddingTop: 6, borderTop: '1px solid var(--paper-200)' }}>
                  <span>Total (incl. GST + delivery)</span>
                  <span className="cell-mono">{fmt(convertTotals.total)}</span>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
