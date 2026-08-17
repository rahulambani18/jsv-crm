import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, storage } from '../lib/api.js'
import { WAREHOUSES, GST_RATE, calcOrderTotals } from '../data/seed.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { showToast } from '../lib/toast.js'
import { usePersistedFilter } from '../lib/usePersistedFilter.js'
import { useAutoRefresh } from '../lib/useAutoRefresh.js'
import PageHeader from '../components/PageHeader.jsx'
import StatCard from '../components/StatCard.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ExportBar from '../components/ExportBar.jsx'
import ComboField from '../components/ComboField.jsx'
import EmptyState from '../components/EmptyState.jsx'
import TableSkeleton from '../components/TableSkeleton.jsx'
import { IconPlus, IconSearch, IconEdit, IconTrash, IconRupee, IconTransfer, IconAlertTriangle } from '../components/Icons.jsx'
import '../styles/components.css'

const TABS = ['Suppliers', 'Quotations', 'Purchase Orders', 'Bills', 'Payments']

const PO_STATUSES = ['Draft', 'Sent', 'Partially Received', 'Received', 'Cancelled']
const PO_STATUS_TONE = { Draft: 'gray', Sent: 'navy', 'Partially Received': 'amber', Received: 'teal', Cancelled: 'red' }
const BILL_STATUSES = ['Unpaid', 'Partial', 'Paid', 'Overdue']
const BILL_STATUS_TONE = { Unpaid: 'red', Partial: 'amber', Paid: 'teal', Overdue: 'red' }
const SUPPLIER_STATUSES = ['Active', 'Inactive']
const PAYMENT_MODES = ['NEFT', 'RTGS', 'Wire Transfer', 'UPI', 'Cheque', 'Cash', 'Letter of Credit']
const PQ_STATUSES = ['Received', 'Selected', 'Rejected', 'Expired']
const PQ_STATUS_TONE = { Received: 'navy', Selected: 'teal', Rejected: 'red', Expired: 'gray' }

function formatINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN') }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function addDays(dateStr, days) {
  if (!dateStr || days == null) return ''
  return new Date(new Date(dateStr).getTime() + days * 86400000).toISOString().slice(0, 10)
}

// Sums everything recorded against a product across a PO's receipt
// history — the receipts array is the single source of truth for how
// much has actually arrived, so PO status is always derived from it
// rather than tracked as a separate field that could drift out of sync.
function receivedQtyForProduct(po, product) {
  return (po.receipts || []).reduce((sum, r) => sum + (r.items.find((i) => i.product === product)?.qty || 0), 0)
}
function poReceiptStatus(po) {
  const lines = po.lineItems || []
  if (lines.length === 0) return po.status
  const totals = lines.map((li) => ({ ordered: Number(li.qty) || 0, received: receivedQtyForProduct(po, li.product) }))
  const allFull = totals.every((t) => t.received >= t.ordered && t.ordered > 0)
  const anyReceived = totals.some((t) => t.received > 0)
  if (allFull) return 'Received'
  if (anyReceived) return 'Partially Received'
  return po.status === 'Cancelled' ? 'Cancelled' : po.status
}

function emptySupplierForm() {
  return { name: '', contact: '', phone: '', email: '', city: '', state: '', gst: '', category: '', paymentTerms: 'Net 30', notes: '', status: 'Active' }
}
function emptyLineItem() { return { product: '', qty: 1, unit: 'kg', unitPrice: 0 } }
function emptyPOForm() {
  return {
    supplierId: '', supplier: '', warehouse: WAREHOUSES[0], orderDate: todayStr(), expectedDelivery: '',
    lineItems: [emptyLineItem()], status: 'Draft', assignedTo: '', notes: '',
  }
}
function emptyPQForm() {
  return {
    rfqRef: '', supplierId: '', supplier: '', quoteDate: todayStr(), validUntil: '',
    lineItems: [emptyLineItem()], moq: '', leadTimeDays: '', paymentTerms: 'Net 30', status: 'Received', notes: '',
    attachmentUrl: '', attachmentName: '',
  }
}
function emptyBillForm() {
  return { supplierId: '', supplier: '', poId: '', poNo: '', supplierInvoiceNo: '', billDate: todayStr(), dueDate: '', subtotal: 0, gstAmount: 0, notes: '', status: 'Unpaid' }
}
function emptyPaymentForm() {
  return { billId: '', supplier: '', amount: '', date: todayStr(), mode: 'NEFT', reference: '', notes: '', status: 'Completed' }
}

export default function Purchases() {
  const { can } = useAuth()
  const canEdit = can('purchases', 'edit')
  const canDelete = can('purchases', 'delete')
  const [searchParams] = useSearchParams()

  const [tab, setTab, tabMeta] = usePersistedFilter('jsv_filter_purchases_tab', searchParams.get('tab'), 'Suppliers')
  const [search, setSearch] = useState('')

  const [suppliers, setSuppliers] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [purchaseQuotations, setPurchaseQuotations] = useState([])
  const [supplierBills, setSupplierBills] = useState([])
  const [supplierPayments, setSupplierPayments] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { refresh() }, [])
  useAutoRefresh(() => refresh(true), 60000)
  useEffect(() => { setSearch(''); setSelectedPQ(new Set()) }, [tab])

  function refresh(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([api.suppliers.list(), api.purchaseOrders.list(), api.purchaseQuotations.list(), api.supplierBills.list(), api.supplierPayments.list(), api.products.list()])
      .then(([sup, po, pq, bill, pay, prod]) => {
        setSuppliers(sup); setPurchaseOrders(po); setPurchaseQuotations(pq); setSupplierBills(bill); setSupplierPayments(pay); setProducts(prod)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  // ---------- top-line stats across the whole module ----------
  const openPOValue = purchaseOrders.filter((p) => !['Received', 'Cancelled'].includes(p.status)).reduce((s, p) => s + Number(p.total || 0), 0)
  const unpaidBillValue = supplierBills.reduce((s, b) => s + Math.max(0, Number(b.total || 0) - Number(b.amountPaid || 0)), 0)
  const overdueBills = supplierBills.filter((b) => b.status !== 'Paid' && b.dueDate && b.dueDate < todayStr()).length
  const paidThisMonth = supplierPayments.filter((p) => (p.date || '').slice(0, 7) === todayStr().slice(0, 7)).reduce((s, p) => s + Number(p.amount || 0), 0)

  // ---------- shared modal state ----------
  const [showModal, setShowModal] = useState(false)
  const [modalKind, setModalKind] = useState(null) // 'supplier' | 'po' | 'pq' | 'pq-compare' | 'bill' | 'payment' | 'receive'
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm())
  const [poForm, setPOForm] = useState(emptyPOForm())
  const [pqForm, setPQForm] = useState(emptyPQForm())
  const [billForm, setBillForm] = useState(emptyBillForm())
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm())
  const [receivingPO, setReceivingPO] = useState(null)
  const [receiveQtys, setReceiveQtys] = useState({})
  const [receiveNotes, setReceiveNotes] = useState('')
  const [selectedPQ, setSelectedPQ] = useState(new Set())
  const [compareList, setCompareList] = useState([])
  const [pqUploading, setPQUploading] = useState(false)
  const [pqUploadError, setPQUploadError] = useState('')

  function closeModal() { setShowModal(false); setModalKind(null); setEditingId(null) }

  // ---------- Suppliers ----------
  const filteredSuppliers = useMemo(() => suppliers.filter((s) =>
    !search || [s.name, s.code, s.city, s.contact].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
  ), [suppliers, search])

  function openCreateSupplier() { setEditingId(null); setSupplierForm(emptySupplierForm()); setModalKind('supplier'); setShowModal(true) }
  function openEditSupplier(s) { setEditingId(s.id); setSupplierForm({ ...emptySupplierForm(), ...s }); setModalKind('supplier'); setShowModal(true) }

  async function handleSaveSupplier(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.suppliers.update(editingId, supplierForm)
        showToast('Supplier updated')
      } else {
        const code = `SUPP-${String(1000 + suppliers.length + 1).slice(1)}`
        await api.suppliers.insert({ ...supplierForm, code, added: todayStr() })
        showToast('Supplier added')
      }
      closeModal(); refresh()
    } catch (err) {
      showToast('Could not save: ' + (err.message || 'Unknown error'), 'error')
    } finally { setSaving(false) }
  }

  async function handleDeleteSupplier(s) {
    if (!confirm(`Delete supplier "${s.name}"? This cannot be undone.`)) return
    try { await api.suppliers.remove(s.id); refresh(); showToast(`Supplier ${s.name} deleted`) }
    catch (err) { showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error') }
  }

  // ---------- Purchase Orders ----------
  const filteredPOs = useMemo(() => purchaseOrders.filter((p) =>
    !search || [p.poNo, p.supplier].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
  ), [purchaseOrders, search])

  const poTotals = useMemo(() => calcOrderTotals(poForm.lineItems, GST_RATE, 0), [poForm.lineItems])

  function updatePOLineItem(index, patch) {
    setPOForm((f) => {
      const items = [...f.lineItems]
      items[index] = { ...items[index], ...patch }
      if (patch.product) {
        const prod = products.find((p) => p.name === patch.product)
        if (prod?.unitPrice) items[index].unitPrice = prod.unitPrice
      }
      return { ...f, lineItems: items }
    })
  }
  function addPOLineItem() { setPOForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] })) }
  function removePOLineItem(i) { setPOForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) })) }
  function handlePOSupplierChange(supplierId) {
    const sup = suppliers.find((s) => s.id === supplierId)
    setPOForm((f) => ({ ...f, supplierId, supplier: sup?.name || f.supplier }))
  }

  function openCreatePO() { setEditingId(null); setPOForm(emptyPOForm()); setModalKind('po'); setShowModal(true) }
  function openEditPO(po) { setEditingId(po.id); setPOForm({ ...emptyPOForm(), ...po }); setModalKind('po'); setShowModal(true) }

  async function handleSavePO(e) {
    e.preventDefault()
    setSaving(true)
    const lineItems = poForm.lineItems.filter((li) => li.product && Number(li.qty) > 0)
      .map((li) => ({ ...li, lineTotal: Math.round((Number(li.qty) || 0) * (Number(li.unitPrice) || 0) * 100) / 100 }))
    const { subtotal, gstAmount, total } = calcOrderTotals(lineItems, GST_RATE, 0)
    const record = {
      supplierId: poForm.supplierId, supplier: poForm.supplier, warehouse: poForm.warehouse,
      orderDate: poForm.orderDate, expectedDelivery: poForm.expectedDelivery, lineItems,
      subtotal, gstRate: GST_RATE, gstAmount, total, status: poForm.status,
      assignedTo: poForm.assignedTo, notes: poForm.notes,
    }
    try {
      if (editingId) {
        await api.purchaseOrders.update(editingId, record)
        showToast('Purchase order updated')
      } else {
        record.poNo = `PUR-2026-${String(1000 + purchaseOrders.length + 1).slice(1)}`
        record.receipts = []
        await api.purchaseOrders.insert(record)
        showToast('Purchase order created')
      }
      closeModal(); refresh()
    } catch (err) {
      showToast('Could not save: ' + (err.message || 'Unknown error'), 'error')
    } finally { setSaving(false) }
  }

  async function handleDeletePO(po) {
    if (!confirm(`Delete purchase order "${po.poNo}"? This cannot be undone.`)) return
    try { await api.purchaseOrders.remove(po.id); refresh(); showToast(`${po.poNo} deleted`) }
    catch (err) { showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error') }
  }

  function openReceive(po) {
    setReceivingPO(po)
    const initial = {}
    ;(po.lineItems || []).forEach((li) => {
      const remaining = (Number(li.qty) || 0) - receivedQtyForProduct(po, li.product)
      initial[li.product] = remaining > 0 ? remaining : 0
    })
    setReceiveQtys(initial)
    setReceiveNotes('')
    setModalKind('receive')
    setShowModal(true)
  }

  async function handleRecordReceipt(e) {
    e.preventDefault()
    if (!receivingPO) return
    setSaving(true)
    const items = Object.entries(receiveQtys).filter(([, qty]) => Number(qty) > 0).map(([product, qty]) => ({ product, qty: Number(qty) }))
    if (items.length === 0) { showToast('Enter a quantity for at least one item', 'error'); setSaving(false); return }
    const receipt = { id: `grn-${Date.now()}`, date: todayStr(), items, notes: receiveNotes, receivedBy: '' }
    const updatedPO = { ...receivingPO, receipts: [...(receivingPO.receipts || []), receipt] }
    const newStatus = poReceiptStatus(updatedPO)
    try {
      await api.purchaseOrders.update(receivingPO.id, { receipts: updatedPO.receipts, status: newStatus })
      showToast(`Receipt recorded for ${receivingPO.poNo}`)
      closeModal(); setReceivingPO(null); refresh()
    } catch (err) {
      showToast('Could not record receipt: ' + (err.message || 'Unknown error'), 'error')
    } finally { setSaving(false) }
  }

  async function handleGenerateBill(po) {
    if (supplierBills.some((b) => b.poId === po.id)) { showToast('This PO already has a bill', 'error'); return }
    try {
      const sup = suppliers.find((s) => s.id === po.supplierId)
      const terms = /Net (\d+)/.exec(sup?.paymentTerms || '')
      const days = terms ? Number(terms[1]) : 30
      await api.supplierBills.insert({
        billNo: `SBILL-2026-${String(1000 + supplierBills.length + 1).slice(1)}`,
        supplierId: po.supplierId, supplier: po.supplier, poId: po.id, poNo: po.poNo,
        supplierInvoiceNo: '', billDate: todayStr(), dueDate: addDays(todayStr(), days),
        subtotal: po.subtotal, gstAmount: po.gstAmount, total: po.total, amountPaid: 0, status: 'Unpaid', notes: `Generated from ${po.poNo}`,
      })
      showToast(`Bill generated for ${po.poNo}`)
      refresh()
    } catch (err) {
      showToast('Could not generate bill: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  // ---------- Purchase Quotations (RFQ responses) ----------
  const filteredPQs = useMemo(() => purchaseQuotations.filter((q) =>
    !search || [q.pqNo, q.rfqRef, q.supplier, ...(q.lineItems || []).map((li) => li.product)].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
  ), [purchaseQuotations, search])

  const rfqRefOptions = useMemo(() => [...new Set(purchaseQuotations.map((q) => q.rfqRef).filter(Boolean))], [purchaseQuotations])

  const pqTotals = useMemo(() => calcOrderTotals(pqForm.lineItems, GST_RATE, 0), [pqForm.lineItems])

  function pqTotal(q) { return calcOrderTotals(q.lineItems || [], q.gstRate || GST_RATE, 0).total }

  function updatePQLineItem(index, patch) {
    setPQForm((f) => {
      const items = [...f.lineItems]
      items[index] = { ...items[index], ...patch }
      if (patch.product) {
        const prod = products.find((p) => p.name === patch.product)
        if (prod?.unitPrice) items[index].unitPrice = prod.unitPrice
      }
      return { ...f, lineItems: items }
    })
  }
  function addPQLineItem() { setPQForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] })) }
  function removePQLineItem(i) { setPQForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) })) }
  function handlePQSupplierChange(supplierId) {
    const sup = suppliers.find((s) => s.id === supplierId)
    setPQForm((f) => ({ ...f, supplierId, supplier: sup?.name || f.supplier }))
  }

  function openCreatePQ() { setEditingId(null); setPQForm(emptyPQForm()); setPQUploadError(''); setModalKind('pq'); setShowModal(true) }
  function openEditPQ(q) { setEditingId(q.id); setPQForm({ ...emptyPQForm(), ...q }); setPQUploadError(''); setModalKind('pq'); setShowModal(true) }

  async function handlePQFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPQUploadError('')
    setPQUploading(true)
    try {
      const { url } = await storage.uploadFile(file, 'purchase-quotations')
      setPQForm((f) => ({ ...f, attachmentUrl: url, attachmentName: file.name }))
    } catch (err) {
      setPQUploadError(err.message || 'Upload failed. Make sure the "attachments" storage bucket exists in Supabase.')
    } finally {
      setPQUploading(false)
    }
  }

  async function handleSavePQ(e) {
    e.preventDefault()
    setSaving(true)
    const lineItems = pqForm.lineItems.filter((li) => li.product && Number(li.qty) > 0)
      .map((li) => ({ ...li, lineTotal: Math.round((Number(li.qty) || 0) * (Number(li.unitPrice) || 0) * 100) / 100 }))
    const { subtotal, gstAmount, total } = calcOrderTotals(lineItems, GST_RATE, 0)
    const record = {
      rfqRef: pqForm.rfqRef || `RFQ-${Date.now()}`, supplierId: pqForm.supplierId, supplier: pqForm.supplier,
      quoteDate: pqForm.quoteDate, validUntil: pqForm.validUntil, lineItems,
      subtotal, gstRate: GST_RATE, gstAmount, total,
      moq: pqForm.moq === '' ? null : Number(pqForm.moq), leadTimeDays: pqForm.leadTimeDays === '' ? null : Number(pqForm.leadTimeDays),
      paymentTerms: pqForm.paymentTerms, status: pqForm.status, notes: pqForm.notes,
      attachmentUrl: pqForm.attachmentUrl, attachmentName: pqForm.attachmentName,
    }
    try {
      if (editingId) {
        await api.purchaseQuotations.update(editingId, record)
        showToast('Quotation updated')
      } else {
        record.pqNo = `PQ-2026-${String(1000 + purchaseQuotations.length + 1).slice(1)}`
        await api.purchaseQuotations.insert(record)
        showToast('Quotation added')
      }
      closeModal(); refresh()
    } catch (err) {
      showToast('Could not save: ' + (err.message || 'Unknown error'), 'error')
    } finally { setSaving(false) }
  }

  async function handleDeletePQ(q) {
    if (!confirm(`Delete quotation "${q.pqNo}"? This cannot be undone.`)) return
    try {
      await api.purchaseQuotations.remove(q.id); refresh()
      setSelectedPQ((prev) => { const next = new Set(prev); next.delete(q.id); return next })
      showToast(`${q.pqNo} deleted`)
    }
    catch (err) { showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error') }
  }

  function togglePQSelected(id) {
    setSelectedPQ((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openCompare() {
    const list = purchaseQuotations.filter((q) => selectedPQ.has(q.id))
    if (list.length < 2) return
    setCompareList(list)
    setModalKind('pq-compare')
    setShowModal(true)
  }

  // Marks the winning quote as Selected, every other quote currently in
  // the comparison as Rejected, then offers to spin up a matching PO —
  // pre-filled from the quote so nothing needs re-typing.
  async function handleSelectWinner(q) {
    try {
      await Promise.all(compareList.map((other) =>
        api.purchaseQuotations.update(other.id, { status: other.id === q.id ? 'Selected' : 'Rejected' })
      ))
      showToast(`${q.pqNo} marked as the winning quote`)
      closeModal(); setSelectedPQ(new Set()); setCompareList([])
      refresh()
      if (confirm(`Create a purchase order from ${q.pqNo} (${q.supplier})?`)) {
        await handleCreatePOFromPQ(q)
      }
    } catch (err) {
      showToast('Could not update quotations: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function handleCreatePOFromPQ(q) {
    try {
      const record = {
        supplierId: q.supplierId, supplier: q.supplier, warehouse: WAREHOUSES[0],
        orderDate: todayStr(), expectedDelivery: q.leadTimeDays ? addDays(todayStr(), Number(q.leadTimeDays)) : '',
        lineItems: (q.lineItems || []).map((li) => ({ ...li })),
        subtotal: q.subtotal, gstRate: q.gstRate || GST_RATE, gstAmount: q.gstAmount, total: q.total,
        status: 'Draft', assignedTo: '', notes: `Created from quotation ${q.pqNo} (${q.rfqRef})`,
        poNo: `PUR-2026-${String(1000 + purchaseOrders.length + 1).slice(1)}`, receipts: [],
      }
      await api.purchaseOrders.insert(record)
      showToast(`Purchase order created from ${q.pqNo}`)
      refresh()
    } catch (err) {
      showToast('Could not create purchase order: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  // ---------- Supplier Bills ----------
  const filteredBills = useMemo(() => supplierBills.filter((b) =>
    !search || [b.billNo, b.supplier, b.poNo, b.supplierInvoiceNo].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
  ), [supplierBills, search])

  function handleBillSupplierChange(supplierId) {
    const sup = suppliers.find((s) => s.id === supplierId)
    setBillForm((f) => ({ ...f, supplierId, supplier: sup?.name || f.supplier, poId: '', poNo: '' }))
  }
  function handleBillPOChange(poId) {
    const po = purchaseOrders.find((p) => p.id === poId)
    setBillForm((f) => ({ ...f, poId, poNo: po?.poNo || '', subtotal: po?.subtotal ?? f.subtotal, gstAmount: po?.gstAmount ?? f.gstAmount }))
  }

  function openCreateBill() { setEditingId(null); setBillForm(emptyBillForm()); setModalKind('bill'); setShowModal(true) }
  function openEditBill(b) { setEditingId(b.id); setBillForm({ ...emptyBillForm(), ...b }); setModalKind('bill'); setShowModal(true) }

  async function handleSaveBill(e) {
    e.preventDefault()
    setSaving(true)
    const subtotal = Number(billForm.subtotal) || 0
    const gstAmount = Number(billForm.gstAmount) || 0
    const total = Math.round((subtotal + gstAmount) * 100) / 100
    const record = { ...billForm, subtotal, gstAmount, total }
    try {
      if (editingId) {
        await api.supplierBills.update(editingId, record)
        showToast('Bill updated')
      } else {
        record.billNo = `SBILL-2026-${String(1000 + supplierBills.length + 1).slice(1)}`
        record.amountPaid = 0
        await api.supplierBills.insert(record)
        showToast('Bill created')
      }
      closeModal(); refresh()
    } catch (err) {
      showToast('Could not save: ' + (err.message || 'Unknown error'), 'error')
    } finally { setSaving(false) }
  }

  async function handleDeleteBill(b) {
    if (!confirm(`Delete bill "${b.billNo}"? This cannot be undone.`)) return
    try { await api.supplierBills.remove(b.id); refresh(); showToast(`${b.billNo} deleted`) }
    catch (err) { showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error') }
  }

  // ---------- Supplier Payments ----------
  const filteredPayments = useMemo(() => supplierPayments.filter((p) =>
    !search || [p.paymentNo, p.supplier, p.reference].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
  ), [supplierPayments, search])

  function openCreatePayment(bill) {
    setEditingId(null)
    if (bill) {
      const remaining = Math.max(0, Number(bill.total || 0) - Number(bill.amountPaid || 0))
      setPaymentForm({ ...emptyPaymentForm(), billId: bill.id, supplier: bill.supplier, amount: remaining })
    } else {
      setPaymentForm(emptyPaymentForm())
    }
    setModalKind('payment'); setShowModal(true)
  }
  function handlePaymentBillChange(billId) {
    const bill = supplierBills.find((b) => b.id === billId)
    const remaining = bill ? Math.max(0, Number(bill.total || 0) - Number(bill.amountPaid || 0)) : ''
    setPaymentForm((f) => ({ ...f, billId, supplier: bill?.supplier || f.supplier, amount: remaining }))
  }

  async function handleSavePayment(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const paymentNo = `SPAY-2026-${String(1000 + supplierPayments.length + 1).slice(1)}`
      await api.supplierPayments.insert({ ...paymentForm, paymentNo, amount: Number(paymentForm.amount) || 0 })
      if (paymentForm.billId) {
        const bill = supplierBills.find((b) => b.id === paymentForm.billId)
        if (bill) {
          const amountPaid = Math.round((Number(bill.amountPaid || 0) + Number(paymentForm.amount || 0)) * 100) / 100
          const status = amountPaid >= Number(bill.total) ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid'
          await api.supplierBills.update(bill.id, { amountPaid, status })
        }
      }
      showToast('Payment recorded')
      closeModal(); refresh()
    } catch (err) {
      showToast('Could not save: ' + (err.message || 'Unknown error'), 'error')
    } finally { setSaving(false) }
  }

  async function handleDeletePayment(p) {
    if (!confirm(`Delete payment "${p.paymentNo}"? This cannot be undone.`)) return
    try { await api.supplierPayments.remove(p.id); refresh(); showToast(`${p.paymentNo} deleted`) }
    catch (err) { showToast('Could not delete: ' + (err.message || 'Unknown error'), 'error') }
  }

  const poSuppliersForBillForm = billForm.supplierId ? purchaseOrders.filter((p) => p.supplierId === billForm.supplierId) : []
  const unpaidBillsForPaymentForm = supplierBills.filter((b) => b.status !== 'Paid')

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle={
          tab === 'Suppliers' ? `${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'}` :
          tab === 'Quotations' ? `${purchaseQuotations.length} quote${purchaseQuotations.length === 1 ? '' : 's'} across ${rfqRefOptions.length} RFQ${rfqRefOptions.length === 1 ? '' : 's'}` :
          tab === 'Purchase Orders' ? `${purchaseOrders.length} purchase order${purchaseOrders.length === 1 ? '' : 's'} · ${formatINR(openPOValue)} open` :
          tab === 'Bills' ? `${supplierBills.length} bill${supplierBills.length === 1 ? '' : 's'} · ${formatINR(unpaidBillValue)} outstanding` :
          `${supplierPayments.length} payment${supplierPayments.length === 1 ? '' : 's'}`
        }
        actions={
          canEdit && (
            <div style={{ display: 'flex', gap: 10 }}>
              {tab === 'Quotations' && (
                <ExportBar
                  title="Purchase Quotations"
                  headers={['RFQ Ref', 'PQ No.', 'Supplier', 'Product(s)', 'Total', 'MOQ', 'Lead Time (days)', 'Payment Terms', 'Valid Until', 'Status']}
                  rows={filteredPQs.map((q) => [
                    q.rfqRef, q.pqNo, q.supplier,
                    (q.lineItems || []).map((li) => li.product).filter(Boolean).join(', '),
                    `₹${Number(pqTotal(q)).toLocaleString('en-IN')}`,
                    q.moq ?? '', q.leadTimeDays ?? '', q.paymentTerms || '', q.validUntil || '', q.status,
                  ])}
                  count={filteredPQs.length}
                />
              )}
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (tab === 'Suppliers') openCreateSupplier()
                  else if (tab === 'Quotations') openCreatePQ()
                  else if (tab === 'Purchase Orders') openCreatePO()
                  else if (tab === 'Bills') openCreateBill()
                  else openCreatePayment(null)
                }}
              >
                <IconPlus width={15} height={15} />
                {tab === 'Suppliers' ? ' New Supplier' : tab === 'Quotations' ? ' New Quotation' : tab === 'Purchase Orders' ? ' New Purchase Order' : tab === 'Bills' ? ' New Bill' : ' Record Payment'}
              </button>
            </div>
          )
        }
      />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <StatCard icon={IconTransfer} tone="blue" label="Open PO Value" value={formatINR(openPOValue)} />
        <StatCard icon={IconRupee} tone="amber" label="Outstanding to Suppliers" value={formatINR(unpaidBillValue)} />
        <StatCard icon={IconAlertTriangle} tone="red" label="Overdue Bills" value={overdueBills} />
        <StatCard icon={IconRupee} tone="teal" label="Paid This Month" value={formatINR(paidThisMonth)} />
      </div>

      <div className="tabs-bar">
        {TABS.map((t) => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab.toLowerCase()}…`} />
        </div>
        {tab === 'Quotations' && (
          <button
            className="btn btn-secondary btn-sm"
            disabled={selectedPQ.size < 2}
            onClick={openCompare}
            title={selectedPQ.size < 2 ? 'Select 2 or more quotations to compare' : 'Compare selected quotations side by side'}
          >
            ⚖️ Compare Selected {selectedPQ.size > 0 ? `(${selectedPQ.size})` : ''}
          </button>
        )}
      </div>

      {tab === 'Quotations' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th style={{ width: 30 }}></th>
              <th>RFQ Ref</th><th>PQ No.</th><th>Supplier</th><th>Product(s)</th><th>Total</th>
              <th>MOQ</th><th>Lead Time</th><th>Payment Terms</th><th>Valid Until</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={11} rows={5} /> : filteredPQs.length === 0 ? (
                <tr className="empty-row"><td colSpan={11}>
                  <EmptyState icon="📋" title="No purchase quotations yet" subtitle="Log supplier quotes against an RFQ, then select two or more to compare them side by side."
                    actionLabel={canEdit ? 'New Quotation' : undefined} onAction={canEdit ? openCreatePQ : undefined} />
                </td></tr>
              ) : filteredPQs.map((q) => {
                const expired = q.status === 'Received' && q.validUntil && q.validUntil < todayStr()
                return (
                <tr key={q.id}>
                  <td>
                    <input type="checkbox" checked={selectedPQ.has(q.id)} onChange={() => togglePQSelected(q.id)} />
                  </td>
                  <td className="cell-mono">{q.rfqRef}</td>
                  <td className="cell-mono cell-strong">
                    {q.pqNo}
                    {q.attachmentUrl && (
                      <a href={q.attachmentUrl} target="_blank" rel="noopener noreferrer" title={q.attachmentName || 'View attached quote'} style={{ marginLeft: 6 }}>📎</a>
                    )}
                  </td>
                  <td>{q.supplier}</td>
                  <td>{(q.lineItems || []).map((li) => li.product).filter(Boolean).join(', ') || <span className="cell-muted">—</span>}</td>
                  <td className="cell-mono cell-strong">{formatINR(pqTotal(q))}</td>
                  <td className="cell-mono">{q.moq ?? <span className="cell-muted">—</span>}</td>
                  <td className="cell-mono">{q.leadTimeDays != null ? `${q.leadTimeDays}d` : <span className="cell-muted">—</span>}</td>
                  <td>{q.paymentTerms || <span className="cell-muted">—</span>}</td>
                  <td className="cell-mono">{q.validUntil || <span className="cell-muted">—</span>}</td>
                  <td><Pill tone={expired ? 'gray' : PQ_STATUS_TONE[q.status] || 'gray'}>{expired ? 'Expired' : q.status}</Pill></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEditPQ(q)}><IconEdit width={13} height={13} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDeletePQ(q)}><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Suppliers' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Code</th><th>Name</th><th>Contact</th><th>Location</th><th>GST</th><th>Payment Terms</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={8} rows={5} /> : filteredSuppliers.length === 0 ? (
                <tr className="empty-row"><td colSpan={8}>
                  <EmptyState icon="🏭" title="No suppliers yet" subtitle="Add your first supplier to start creating purchase orders."
                    actionLabel={canEdit ? 'New Supplier' : undefined} onAction={canEdit ? openCreateSupplier : undefined} />
                </td></tr>
              ) : filteredSuppliers.map((s) => (
                <tr key={s.id}>
                  <td className="cell-mono">{s.code}</td>
                  <td className="cell-strong">{s.name}<br /><span className="cell-muted" style={{ fontSize: 11 }}>{s.category}</span></td>
                  <td>{s.contact}<br /><span className="cell-muted" style={{ fontSize: 11 }}>{s.phone}</span></td>
                  <td>{[s.city, s.state].filter(Boolean).join(', ') || <span className="cell-muted">—</span>}</td>
                  <td className="cell-mono">{s.gst || <span className="cell-muted">—</span>}</td>
                  <td>{s.paymentTerms}</td>
                  <td><Pill tone={s.status === 'Active' ? 'teal' : 'gray'}>{s.status}</Pill></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEditSupplier(s)}><IconEdit width={13} height={13} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDeleteSupplier(s)}><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Purchase Orders' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>PO No.</th><th>Supplier</th><th>Warehouse</th><th>Order Date</th><th>Expected</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={8} rows={5} /> : filteredPOs.length === 0 ? (
                <tr className="empty-row"><td colSpan={8}>
                  <EmptyState icon="📦" title="No purchase orders yet" subtitle="Create a purchase order to start restocking from a supplier."
                    actionLabel={canEdit ? 'New Purchase Order' : undefined} onAction={canEdit ? openCreatePO : undefined} />
                </td></tr>
              ) : filteredPOs.map((po) => {
                const hasBill = supplierBills.some((b) => b.poId === po.id)
                const canReceive = canEdit && !['Received', 'Cancelled', 'Draft'].includes(po.status)
                return (
                <tr key={po.id}>
                  <td className="cell-mono cell-strong">{po.poNo}</td>
                  <td>{po.supplier}</td>
                  <td>{po.warehouse}</td>
                  <td className="cell-mono">{po.orderDate}</td>
                  <td className="cell-mono">{po.expectedDelivery || <span className="cell-muted">—</span>}</td>
                  <td className="cell-mono cell-strong">{formatINR(po.total)}</td>
                  <td><Pill tone={PO_STATUS_TONE[po.status] || 'gray'}>{po.status}</Pill></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {canReceive && (
                        <button className="btn btn-ghost btn-sm" title="Record goods receipt" onClick={() => openReceive(po)}>📥 Receive</button>
                      )}
                      {canEdit && ['Partially Received', 'Received'].includes(po.status) && !hasBill && (
                        <button className="btn btn-ghost btn-sm" title="Generate a supplier bill from this PO" onClick={() => handleGenerateBill(po)}>🧾 Bill</button>
                      )}
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEditPO(po)}><IconEdit width={13} height={13} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDeletePO(po)}><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Bills' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Bill No.</th><th>Supplier</th><th>PO</th><th>Bill Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={10} rows={5} /> : filteredBills.length === 0 ? (
                <tr className="empty-row"><td colSpan={10}>
                  <EmptyState icon="🧾" title="No supplier bills yet" subtitle="Bills appear here once you record one manually or generate one from a received purchase order."
                    actionLabel={canEdit ? 'New Bill' : undefined} onAction={canEdit ? openCreateBill : undefined} />
                </td></tr>
              ) : filteredBills.map((b) => {
                const balance = Math.max(0, Number(b.total || 0) - Number(b.amountPaid || 0))
                const overdue = b.status !== 'Paid' && b.dueDate && b.dueDate < todayStr()
                return (
                <tr key={b.id}>
                  <td className="cell-mono cell-strong">{b.billNo}</td>
                  <td>{b.supplier}</td>
                  <td className="cell-mono">{b.poNo || <span className="cell-muted">—</span>}</td>
                  <td className="cell-mono">{b.billDate}</td>
                  <td className="cell-mono">{b.dueDate}</td>
                  <td className="cell-mono">{formatINR(b.total)}</td>
                  <td className="cell-mono">{formatINR(b.amountPaid)}</td>
                  <td className="cell-mono" style={{ color: balance > 0 ? 'var(--red-600)' : undefined, fontWeight: 600 }}>{formatINR(balance)}</td>
                  <td><Pill tone={overdue ? 'red' : BILL_STATUS_TONE[b.status] || 'gray'}>{overdue ? 'Overdue' : b.status}</Pill></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {canEdit && balance > 0 && <button className="btn btn-ghost btn-sm" onClick={() => openCreatePayment(b)}>💳 Pay</button>}
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => openEditBill(b)}><IconEdit width={13} height={13} /></button>}
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDeleteBill(b)}><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Payments' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Payment No.</th><th>Supplier</th><th>Bill</th><th>Amount</th><th>Date</th><th>Mode</th><th>Reference</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={8} rows={5} /> : filteredPayments.length === 0 ? (
                <tr className="empty-row"><td colSpan={8}>
                  <EmptyState icon="💳" title="No supplier payments yet" subtitle="Record a payment against a supplier bill to track what's been settled."
                    actionLabel={canEdit ? 'Record Payment' : undefined} onAction={canEdit ? () => openCreatePayment(null) : undefined} />
                </td></tr>
              ) : filteredPayments.map((p) => {
                const bill = supplierBills.find((b) => b.id === p.billId)
                return (
                <tr key={p.id}>
                  <td className="cell-mono cell-strong">{p.paymentNo}</td>
                  <td>{p.supplier}</td>
                  <td className="cell-mono">{bill?.billNo || <span className="cell-muted">—</span>}</td>
                  <td className="cell-mono cell-strong">{formatINR(p.amount)}</td>
                  <td className="cell-mono">{p.date}</td>
                  <td>{p.mode}</td>
                  <td className="cell-mono">{p.reference || <span className="cell-muted">—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDeletePayment(p)}><IconTrash width={13} height={13} /></button>}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Supplier modal ---------- */}
      {showModal && modalKind === 'supplier' && (
        <Modal
          title={editingId ? 'Edit Supplier' : 'New Supplier'}
          onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" form="supplier-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save supplier'}</button>
          </>}
        >
          <form id="supplier-form" onSubmit={handleSaveSupplier}>
            <div className="field-row">
              <div className="field"><label>Supplier name</label>
                <input required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
              <div className="field"><label>Category</label>
                <input value={supplierForm.category} onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })} placeholder="e.g. Preservatives" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Contact person</label>
                <input value={supplierForm.contact} onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })} /></div>
              <div className="field"><label>Phone</label>
                <input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Email</label>
                <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
              <div className="field"><label>GST No.</label>
                <input value={supplierForm.gst} onChange={(e) => setSupplierForm({ ...supplierForm, gst: e.target.value })} placeholder="Leave blank for overseas suppliers" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>City</label>
                <input value={supplierForm.city} onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })} /></div>
              <div className="field"><label>State</label>
                <input value={supplierForm.state} onChange={(e) => setSupplierForm({ ...supplierForm, state: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Payment terms</label>
                <select value={supplierForm.paymentTerms} onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}>
                  <option>Due on Receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Letter of Credit</option>
                </select></div>
              <div className="field"><label>Status</label>
                <select value={supplierForm.status} onChange={(e) => setSupplierForm({ ...supplierForm, status: e.target.value })}>
                  {SUPPLIER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select></div>
            </div>
            <div className="field"><label>Notes</label>
              <textarea rows={2} value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} /></div>
          </form>
        </Modal>
      )}

      {/* ---------- Purchase Quotation modal ---------- */}
      {showModal && modalKind === 'pq' && (
        <Modal
          title={editingId ? 'Edit Quotation' : 'New Purchase Quotation'}
          size="lg"
          onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" form="pq-form" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save quotation'}</button>
          </>}
        >
          <form id="pq-form" onSubmit={handleSavePQ}>
            <div className="field-row">
              <div className="field"><label>RFQ reference</label>
                <ComboField
                  options={rfqRefOptions}
                  value={pqForm.rfqRef}
                  onChange={(v) => setPQForm({ ...pqForm, rfqRef: v })}
                  placeholder="e.g. RFQ-2026-0009 — reuse to group quotes for comparison"
                /></div>
              <div className="field"><label>Supplier</label>
                <select required value={pqForm.supplierId} onChange={(e) => handlePQSupplierChange(e.target.value)}>
                  <option value="" disabled>Select supplier…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Quote date</label>
                <input type="date" required value={pqForm.quoteDate} onChange={(e) => setPQForm({ ...pqForm, quoteDate: e.target.value })} /></div>
              <div className="field"><label>Valid until</label>
                <input type="date" value={pqForm.validUntil} onChange={(e) => setPQForm({ ...pqForm, validUntil: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>MOQ</label>
                <input type="number" min="0" value={pqForm.moq} onChange={(e) => setPQForm({ ...pqForm, moq: e.target.value })} placeholder="Minimum order quantity" /></div>
              <div className="field"><label>Lead time (days)</label>
                <input type="number" min="0" value={pqForm.leadTimeDays} onChange={(e) => setPQForm({ ...pqForm, leadTimeDays: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Payment terms</label>
                <select value={pqForm.paymentTerms} onChange={(e) => setPQForm({ ...pqForm, paymentTerms: e.target.value })}>
                  <option>Due on Receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Letter of Credit</option>
                </select></div>
              <div className="field"><label>Status</label>
                <select value={pqForm.status} onChange={(e) => setPQForm({ ...pqForm, status: e.target.value })}>
                  {PQ_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select></div>
            </div>

            <div className="field">
              <label>Line items</label>
              <div style={{ border: '1px solid var(--paper-200)', borderRadius: 8, overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 480, fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'var(--paper-0)' }}>
                    <th style={{ textAlign: 'left', padding: 8, fontWeight: 600, fontSize: 11 }}>Product</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 64 }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 64 }}>Unit</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 90 }}>Unit Price</th>
                    <th style={{ textAlign: 'right', padding: 8, fontWeight: 600, fontSize: 11, width: 90 }}>Total</th>
                    <th style={{ width: 30 }}></th>
                  </tr></thead>
                  <tbody>
                    {pqForm.lineItems.map((li, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--paper-100)' }}>
                        <td style={{ padding: 6 }}>
                          <select value={li.product} onChange={(e) => updatePQLineItem(i, { product: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="">Select product…</option>
                            {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 6 }}><input type="number" min="0" value={li.qty} onChange={(e) => updatePQLineItem(i, { qty: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }} /></td>
                        <td style={{ padding: 6 }}>
                          <select value={li.unit} onChange={(e) => updatePQLineItem(i, { unit: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="kg">kg</option><option value="g">g</option><option value="MT">MT</option><option value="L">L</option>
                          </select>
                        </td>
                        <td style={{ padding: 6 }}><input type="number" min="0" value={li.unitPrice} onChange={(e) => updatePQLineItem(i, { unitPrice: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }} /></td>
                        <td className="cell-mono" style={{ padding: '6px 8px', textAlign: 'right' }}>{formatINR((Number(li.qty) || 0) * (Number(li.unitPrice) || 0))}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePQLineItem(i)} disabled={pqForm.lineItems.length === 1}><IconTrash width={13} height={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addPQLineItem} style={{ marginTop: 8 }}><IconPlus width={13} height={13} /> Add line item</button>
            </div>

            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--paper-0)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>Subtotal</span><span className="cell-mono">{formatINR(pqTotals.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>GST ({GST_RATE}%)</span><span className="cell-mono">{formatINR(pqTotals.gstAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14.5, paddingTop: 6, borderTop: '1px solid var(--paper-200)' }}>
                <span>Total</span><span className="cell-mono">{formatINR(pqTotals.total)}</span>
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}><label>Notes</label>
              <textarea rows={2} value={pqForm.notes} onChange={(e) => setPQForm({ ...pqForm, notes: e.target.value })} /></div>

            <div className="field" style={{ marginTop: 14 }}>
              <label>Attach supplier's quote (PDF, Excel, Image, email)</label>
              <input
                type="file"
                accept=".pdf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.eml,.msg,.doc,.docx"
                onChange={handlePQFileSelect}
                disabled={pqUploading}
              />
              {pqUploading && <p style={{ fontSize: 11.5, color: 'var(--ink-400)', margin: '4px 0 0' }}>Uploading…</p>}
              {pqUploadError && <p style={{ fontSize: 11.5, color: 'var(--red-600)', margin: '4px 0 0' }}>{pqUploadError}</p>}
              {pqForm.attachmentUrl && !pqUploading && (
                <p style={{ fontSize: 11.5, color: 'var(--teal-700)', margin: '4px 0 0' }}>
                  ✓ {pqForm.attachmentName || 'File attached'} — <a href={pqForm.attachmentUrl} target="_blank" rel="noopener noreferrer">preview</a>
                  {' · '}
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 4px', height: 'auto' }} onClick={() => setPQForm((f) => ({ ...f, attachmentUrl: '', attachmentName: '' }))}>remove</button>
                </p>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* ---------- Compare Quotations modal ---------- */}
      {showModal && modalKind === 'pq-compare' && compareList.length > 0 && (() => {
        const allProducts = [...new Set(compareList.flatMap((q) => (q.lineItems || []).map((li) => li.product)))]
        const totals = compareList.map((q) => pqTotal(q))
        const minTotal = Math.min(...totals)
        const minLeadTime = Math.min(...compareList.filter((q) => q.leadTimeDays != null).map((q) => Number(q.leadTimeDays)))
        return (
          <Modal
            title={`Compare Quotations${compareList[0]?.rfqRef ? ` — ${compareList[0].rfqRef}` : ''}`}
            size="lg"
            onClose={closeModal}
            footer={<button className="btn btn-secondary" onClick={closeModal}>Close</button>}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 480 + compareList.length * 160, fontSize: 12.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--paper-0)' }}>
                    <th style={{ textAlign: 'left', padding: 8, fontWeight: 600, fontSize: 11, width: 130 }}></th>
                    {compareList.map((q) => (
                      <th key={q.id} style={{ textAlign: 'left', padding: 8, fontWeight: 700, fontSize: 12.5, minWidth: 150 }}>
                        {q.supplier}<br /><span className="cell-muted" style={{ fontWeight: 400, fontSize: 11 }}>{q.pqNo}</span>
                        {q.attachmentUrl && (
                          <><br /><a href={q.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11 }}>📎 {q.attachmentName || 'View file'}</a></>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((prod) => (
                    <tr key={prod} style={{ borderTop: '1px solid var(--paper-100)' }}>
                      <td style={{ padding: 8, fontWeight: 600, fontSize: 11 }}>{prod}</td>
                      {compareList.map((q) => {
                        const li = (q.lineItems || []).find((l) => l.product === prod)
                        if (!li) return <td key={q.id} className="cell-muted" style={{ padding: 8 }}>— not quoted</td>
                        const cheapest = compareList.every((other) => {
                          const oli = (other.lineItems || []).find((l) => l.product === prod)
                          return !oli || Number(oli.unitPrice) >= Number(li.unitPrice)
                        })
                        return (
                          <td key={q.id} className="cell-mono" style={{ padding: 8, background: cheapest ? 'var(--teal-50, #ecfdf5)' : undefined, fontWeight: cheapest ? 700 : 400 }}>
                            {li.qty} {li.unit} @ {formatINR(li.unitPrice)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid var(--paper-200)' }}>
                    <td style={{ padding: 8, fontWeight: 600, fontSize: 11 }}>MOQ</td>
                    {compareList.map((q) => <td key={q.id} className="cell-mono" style={{ padding: 8 }}>{q.moq ?? <span className="cell-muted">—</span>}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding: 8, fontWeight: 600, fontSize: 11 }}>Lead time</td>
                    {compareList.map((q) => (
                      <td key={q.id} className="cell-mono" style={{ padding: 8, background: Number(q.leadTimeDays) === minLeadTime ? 'var(--teal-50, #ecfdf5)' : undefined, fontWeight: Number(q.leadTimeDays) === minLeadTime ? 700 : 400 }}>
                        {q.leadTimeDays != null ? `${q.leadTimeDays}d` : <span className="cell-muted">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: 8, fontWeight: 600, fontSize: 11 }}>Payment terms</td>
                    {compareList.map((q) => <td key={q.id} style={{ padding: 8 }}>{q.paymentTerms || <span className="cell-muted">—</span>}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding: 8, fontWeight: 600, fontSize: 11 }}>Valid until</td>
                    {compareList.map((q) => <td key={q.id} className="cell-mono" style={{ padding: 8 }}>{q.validUntil || <span className="cell-muted">—</span>}</td>)}
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--paper-200)' }}>
                    <td style={{ padding: 8, fontWeight: 700, fontSize: 12.5 }}>Total</td>
                    {compareList.map((q) => {
                      const t = pqTotal(q)
                      return (
                        <td key={q.id} className="cell-mono" style={{ padding: 8, fontWeight: 700, fontSize: 13.5, background: t === minTotal ? 'var(--teal-50, #ecfdf5)' : undefined, color: t === minTotal ? 'var(--teal-700, #0f766e)' : undefined }}>
                          {formatINR(t)}
                        </td>
                      )
                    })}
                  </tr>
                  {canEdit && (
                    <tr>
                      <td style={{ padding: 8 }}></td>
                      {compareList.map((q) => (
                        <td key={q.id} style={{ padding: 8 }}>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSelectWinner(q)}>
                            ✅ Select winner
                          </button>
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 12, marginBottom: 0 }}>
              Lowest price and shortest lead time are highlighted. Selecting a winner marks the other compared quotations as Rejected and offers to create a purchase order from the winner.
            </p>
          </Modal>
        )
      })()}

      {/* ---------- Purchase Order modal ---------- */}
      {showModal && modalKind === 'po' && (
        <Modal
          title={editingId ? 'Edit Purchase Order' : 'New Purchase Order'}
          size="lg"
          onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" form="po-form" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save purchase order'}</button>
          </>}
        >
          <form id="po-form" onSubmit={handleSavePO}>
            <div className="field-row">
              <div className="field"><label>Supplier</label>
                <select required value={poForm.supplierId} onChange={(e) => handlePOSupplierChange(e.target.value)}>
                  <option value="" disabled>Select supplier…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              <div className="field"><label>Receiving warehouse</label>
                <ComboField options={WAREHOUSES} value={poForm.warehouse} onChange={(v) => setPOForm({ ...poForm, warehouse: v })} placeholder="Select location…" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Order date</label>
                <input type="date" required value={poForm.orderDate} onChange={(e) => setPOForm({ ...poForm, orderDate: e.target.value })} /></div>
              <div className="field"><label>Expected delivery</label>
                <input type="date" value={poForm.expectedDelivery} onChange={(e) => setPOForm({ ...poForm, expectedDelivery: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Assigned to</label>
                <input value={poForm.assignedTo} onChange={(e) => setPOForm({ ...poForm, assignedTo: e.target.value })} /></div>
              <div className="field"><label>Status</label>
                <select value={poForm.status} onChange={(e) => setPOForm({ ...poForm, status: e.target.value })}>
                  {PO_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select></div>
            </div>

            <div className="field">
              <label>Line items</label>
              <div style={{ border: '1px solid var(--paper-200)', borderRadius: 8, overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 480, fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'var(--paper-0)' }}>
                    <th style={{ textAlign: 'left', padding: 8, fontWeight: 600, fontSize: 11 }}>Product</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 64 }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 64 }}>Unit</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600, fontSize: 11, width: 90 }}>Unit Price</th>
                    <th style={{ textAlign: 'right', padding: 8, fontWeight: 600, fontSize: 11, width: 90 }}>Total</th>
                    <th style={{ width: 30 }}></th>
                  </tr></thead>
                  <tbody>
                    {poForm.lineItems.map((li, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--paper-100)' }}>
                        <td style={{ padding: 6 }}>
                          <select value={li.product} onChange={(e) => updatePOLineItem(i, { product: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="">Select product…</option>
                            {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 6 }}><input type="number" min="0" value={li.qty} onChange={(e) => updatePOLineItem(i, { qty: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }} /></td>
                        <td style={{ padding: 6 }}>
                          <select value={li.unit} onChange={(e) => updatePOLineItem(i, { unit: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }}>
                            <option value="kg">kg</option><option value="g">g</option><option value="MT">MT</option><option value="L">L</option>
                          </select>
                        </td>
                        <td style={{ padding: 6 }}><input type="number" min="0" value={li.unitPrice} onChange={(e) => updatePOLineItem(i, { unitPrice: e.target.value })} style={{ width: '100%', fontSize: 12.5, padding: '6px 8px' }} /></td>
                        <td className="cell-mono" style={{ padding: '6px 8px', textAlign: 'right' }}>{formatINR((Number(li.qty) || 0) * (Number(li.unitPrice) || 0))}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePOLineItem(i)} disabled={poForm.lineItems.length === 1}><IconTrash width={13} height={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addPOLineItem} style={{ marginTop: 8 }}><IconPlus width={13} height={13} /> Add line item</button>
            </div>

            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--paper-0)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>Subtotal</span><span className="cell-mono">{formatINR(poTotals.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--ink-500)' }}>GST ({GST_RATE}%)</span><span className="cell-mono">{formatINR(poTotals.gstAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14.5, paddingTop: 6, borderTop: '1px solid var(--paper-200)' }}>
                <span>Total</span><span className="cell-mono">{formatINR(poTotals.total)}</span>
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}><label>Notes</label>
              <textarea rows={2} value={poForm.notes} onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })} /></div>
          </form>
        </Modal>
      )}

      {/* ---------- Receive (GRN) modal ---------- */}
      {showModal && modalKind === 'receive' && receivingPO && (
        <Modal
          title={`Receive — ${receivingPO.poNo}`}
          onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" form="receive-form" type="submit" disabled={saving}>{saving ? 'Recording…' : 'Record receipt'}</button>
          </>}
        >
          <form id="receive-form" onSubmit={handleRecordReceipt}>
            <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 0 }}>Enter the quantity that has actually arrived for each item. Previous receipts are already accounted for below.</p>
            <div style={{ border: '1px solid var(--paper-200)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'var(--paper-0)' }}>
                  <th style={{ textAlign: 'left', padding: 8, fontWeight: 600, fontSize: 11 }}>Product</th>
                  <th style={{ textAlign: 'right', padding: 8, fontWeight: 600, fontSize: 11 }}>Ordered</th>
                  <th style={{ textAlign: 'right', padding: 8, fontWeight: 600, fontSize: 11 }}>Already received</th>
                  <th style={{ textAlign: 'right', padding: 8, fontWeight: 600, fontSize: 11, width: 110 }}>Receiving now</th>
                </tr></thead>
                <tbody>
                  {(receivingPO.lineItems || []).map((li) => {
                    const already = receivedQtyForProduct(receivingPO, li.product)
                    return (
                      <tr key={li.product} style={{ borderTop: '1px solid var(--paper-100)' }}>
                        <td style={{ padding: 8 }}>{li.product} <span className="cell-muted">({li.unit})</span></td>
                        <td className="cell-mono" style={{ padding: 8, textAlign: 'right' }}>{li.qty}</td>
                        <td className="cell-mono" style={{ padding: 8, textAlign: 'right' }}>{already}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>
                          <input
                            type="number" min="0" max={li.qty}
                            value={receiveQtys[li.product] ?? 0}
                            onChange={(e) => setReceiveQtys((q) => ({ ...q, [li.product]: e.target.value }))}
                            style={{ width: 90, fontSize: 12.5, padding: '6px 8px', textAlign: 'right' }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="field" style={{ marginTop: 14 }}><label>Notes</label>
              <textarea rows={2} value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} placeholder="Quality check remarks, partial shipment reference, etc." /></div>
          </form>
        </Modal>
      )}

      {/* ---------- Supplier Bill modal ---------- */}
      {showModal && modalKind === 'bill' && (
        <Modal
          title={editingId ? 'Edit Bill' : 'New Supplier Bill'}
          onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" form="bill-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save bill'}</button>
          </>}
        >
          <form id="bill-form" onSubmit={handleSaveBill}>
            <div className="field-row">
              <div className="field"><label>Supplier</label>
                <select required value={billForm.supplierId} onChange={(e) => handleBillSupplierChange(e.target.value)}>
                  <option value="" disabled>Select supplier…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select></div>
              <div className="field"><label>Linked purchase order</label>
                <select value={billForm.poId} onChange={(e) => handleBillPOChange(e.target.value)} disabled={!billForm.supplierId}>
                  <option value="">None</option>
                  {poSuppliersForBillForm.map((p) => <option key={p.id} value={p.id}>{p.poNo}</option>)}
                </select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Supplier invoice no.</label>
                <input value={billForm.supplierInvoiceNo} onChange={(e) => setBillForm({ ...billForm, supplierInvoiceNo: e.target.value })} /></div>
              <div className="field"><label>Status</label>
                <select value={billForm.status} onChange={(e) => setBillForm({ ...billForm, status: e.target.value })}>
                  {BILL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Bill date</label>
                <input type="date" required value={billForm.billDate} onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })} /></div>
              <div className="field"><label>Due date</label>
                <input type="date" required value={billForm.dueDate} onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Subtotal</label>
                <input type="number" min="0" required value={billForm.subtotal} onChange={(e) => setBillForm({ ...billForm, subtotal: e.target.value })} /></div>
              <div className="field"><label>GST amount</label>
                <input type="number" min="0" value={billForm.gstAmount} onChange={(e) => setBillForm({ ...billForm, gstAmount: e.target.value })} /></div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--paper-0)', borderRadius: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total</span><span className="cell-mono">{formatINR((Number(billForm.subtotal) || 0) + (Number(billForm.gstAmount) || 0))}</span>
            </div>
            <div className="field" style={{ marginTop: 14 }}><label>Notes</label>
              <textarea rows={2} value={billForm.notes} onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })} /></div>
          </form>
        </Modal>
      )}

      {/* ---------- Supplier Payment modal ---------- */}
      {showModal && modalKind === 'payment' && (
        <Modal
          title="Record Supplier Payment"
          onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" form="payment-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</button>
          </>}
        >
          <form id="payment-form" onSubmit={handleSavePayment}>
            <div className="field"><label>Bill</label>
              <select required value={paymentForm.billId} onChange={(e) => handlePaymentBillChange(e.target.value)}>
                <option value="" disabled>Select bill…</option>
                {unpaidBillsForPaymentForm.map((b) => {
                  const balance = Math.max(0, Number(b.total || 0) - Number(b.amountPaid || 0))
                  return <option key={b.id} value={b.id}>{b.billNo} — {b.supplier} ({formatINR(balance)} due)</option>
                })}
              </select></div>
            <div className="field-row">
              <div className="field"><label>Amount</label>
                <input type="number" min="0" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
              <div className="field"><label>Date</label>
                <input type="date" required value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Mode</label>
                <select value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}>
                  {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                </select></div>
              <div className="field"><label>Reference no.</label>
                <input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} /></div>
            </div>
            <div className="field"><label>Notes</label>
              <textarea rows={2} value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
