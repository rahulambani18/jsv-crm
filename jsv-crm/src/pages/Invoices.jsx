import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Pill from '../components/Pill.jsx'
import Modal from '../components/Modal.jsx'
import ExportBar from '../components/ExportBar.jsx'
import TallyImportButton from '../components/TallyImportButton.jsx'
import TallyExportButton from '../components/TallyExportButton.jsx'
import SendButtons from '../components/SendButtons.jsx'
import BulkActionsBar from '../components/BulkActionsBar.jsx'
import BulkReminderModal from '../components/BulkReminderModal.jsx'
import RowActionsMenu from '../components/RowActionsMenu.jsx'
import Pagination from '../components/Pagination.jsx'
import { IconPlus, IconSearch, IconEdit, IconTrash, IconReceipt, IconDollarSign, IconFlame, IconClock } from '../components/Icons.jsx'
import StatCard from '../components/StatCard.jsx'
import Dropdown from '../components/Dropdown.jsx'
import { isInvoiceOverdue } from '../lib/overdue.js'
import { outstandingForCustomer } from '../lib/credit.js'
import { exportCSV } from '../lib/exportUtils.js'
import { showToast } from '../lib/toast.js'
import '../styles/components.css'
import EmptyState from '../components/EmptyState.jsx'

const GST_RATE = 18

const STATUS_OPTIONS = ['Draft', 'Sent', 'Paid', 'Unpaid', 'Overdue', 'Cancelled']
const PAYMENT_MODES = ['NEFT', 'RTGS', 'Cheque', 'Cash', 'UPI', 'Bank Transfer']
const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom']

function termsToDays(terms) {
  const match = /Net (\d+)/.exec(terms || '')
  return match ? Number(match[1]) : null
}

function addDays(dateStr, days) {
  if (!dateStr || days == null) return ''
  return new Date(new Date(dateStr).getTime() + days * 86400000).toISOString().slice(0, 10)
}

function emptyForm() {
  return {
    company: '', orderId: '', issueDate: new Date().toISOString().slice(0, 10),
    dueDate: addDays(new Date().toISOString().slice(0, 10), 30), paymentTerms: 'Net 30',
    subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
    status: 'Draft', paymentMode: '', notes: '',
  }
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

// The Status field can be set to "Overdue" by hand (New/Edit Invoice
// form) independently of dueDate, and that's what the table's red
// "Overdue" pill actually reflects. Treat an invoice as overdue for
// reminder purposes if EITHER that manual status says so OR the due
// date has actually passed — so bulk reminders match what a rep sees
// in the table, not just the date math.
function isOverdueForReminder(inv) {
  return inv.status === 'Overdue' || isInvoiceOverdue(inv)
}

function numberToWords(n) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  function convert(num) {
    if (num === 0) return ''
    if (num < 20) return ones[num] + ' '
    if (num < 100) return tens[Math.floor(num/10)] + ' ' + ones[num%10] + ' '
    if (num < 1000) return ones[Math.floor(num/100)] + ' Hundred ' + convert(num%100)
    if (num < 100000) return convert(Math.floor(num/1000)) + 'Thousand ' + convert(num%1000)
    if (num < 10000000) return convert(Math.floor(num/100000)) + 'Lakh ' + convert(num%100000)
    return convert(Math.floor(num/10000000)) + 'Crore ' + convert(num%10000000)
  }
  const rupees = Math.floor(n)
  const paise = Math.round((n - rupees) * 100)
  let words = 'Rupees ' + convert(rupees).trim()
  if (paise > 0) words += ' and ' + convert(paise).trim() + ' Paise'
  return words + ' Only'
}

function buildInvoiceHTML(inv, order) {
  const lineItems = order?.lineItems || []
  const isInterstate = Number(inv.igst || 0) > 0
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Tax Invoice - ${inv.invoiceNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 8mm; border: 1px solid #000; }
  .top-bar { text-align: center; background: #0f1e3d; color: #fff; padding: 4px 0; font-size: 10px; font-weight: bold; letter-spacing: 0.08em; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border: 1px solid #000; border-top: none; padding: 8px 10px; }
  .company-block { flex: 1; }
  .company-name { font-size: 18px; font-weight: 900; color: #0f1e3d; }
  .company-sub { font-size: 9px; color: #444; margin: 1px 0; }
  .company-address { font-size: 9.5px; margin-top: 5px; line-height: 1.5; }
  .inv-title-block { text-align: right; flex: 0 0 160px; border-left: 1px solid #ccc; padding-left: 10px; }
  .inv-title { font-size: 14px; font-weight: 900; color: #0f1e3d; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
  .inv-title-block table { width: 100%; font-size: 10px; }
  .inv-title-block td { padding: 2px 0; }
  .inv-title-block td:last-child { font-weight: bold; }
  .parties { display: flex; border: 1px solid #000; border-top: none; }
  .party-box { flex: 1; padding: 6px 8px; }
  .party-box + .party-box { border-left: 1px solid #000; }
  .party-label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 3px; }
  .party-name { font-size: 12px; font-weight: bold; }
  .party-detail { font-size: 10px; line-height: 1.6; margin-top: 2px; }
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table th { background: #0f1e3d; color: #fff; padding: 5px 6px; font-size: 9.5px; text-align: center; border: 1px solid #000; font-weight: bold; }
  .items-table th.left { text-align: left; }
  .items-table td { padding: 5px 6px; font-size: 10px; border: 1px solid #ccc; vertical-align: top; }
  .items-table td.center { text-align: center; }
  .items-table td.right { text-align: right; }
  .items-table tr.total-row td { font-weight: bold; background: #f0f0f0; border-color: #000; }
  .bottom-section { display: flex; border: 1px solid #000; border-top: none; }
  .tax-summary { flex: 1; padding: 6px 8px; border-right: 1px solid #000; }
  .tax-summary table { width: 100%; font-size: 10px; border-collapse: collapse; }
  .tax-summary th { background: #e8ecf5; padding: 4px 6px; text-align: center; border: 1px solid #ccc; font-size: 9.5px; }
  .tax-summary td { padding: 4px 6px; border: 1px solid #ddd; text-align: right; font-size: 10px; }
  .tax-summary td.left { text-align: left; }
  .totals-box { width: 220px; padding: 6px 8px; }
  .totals-box table { width: 100%; font-size: 10.5px; }
  .totals-box td { padding: 3px 4px; }
  .totals-box td:last-child { text-align: right; font-weight: 600; }
  .totals-box tr.grand td { font-size: 13px; font-weight: 900; border-top: 2px solid #000; padding-top: 5px; color: #0f1e3d; }
  .amount-words { border: 1px solid #000; border-top: none; padding: 5px 8px; font-size: 10px; }
  .footer-section { display: flex; border: 1px solid #000; border-top: none; }
  .bank-details { flex: 1; padding: 6px 8px; border-right: 1px solid #000; font-size: 10px; line-height: 1.7; }
  .bank-details strong { font-size: 10.5px; display: block; margin-bottom: 3px; }
  .sign-block { width: 180px; padding: 6px 8px; text-align: center; }
  .sign-block .company-sign { font-size: 10px; font-weight: bold; margin-bottom: 40px; }
  .sign-block .sign-line { border-top: 1px solid #000; padding-top: 4px; font-size: 9.5px; }
  .terms { border: 1px solid #000; border-top: none; padding: 5px 8px; font-size: 9px; color: #555; }
  @media print { body { margin: 0; } .page { border: none; padding: 5mm; width: 100%; } @page { size: A4; margin: 8mm; } }
</style></head>
<body><div class="page">

<div class="top-bar">TAX INVOICE</div>

<div class="header">
  <div class="company-block">
    <div class="company-name">JSV INGREDIENT</div>
    <div class="company-sub">Formerly known as Sanjay Chemicals - P.M. Vora &amp; Co.</div>
    <div class="company-sub">Importers &amp; Stockists of Food Additives &amp; Chemicals</div>
    <div class="company-address">
      301, Sterling Estate, Inside Spectra Motor Compound, Ramchandra Lane Extn.,<br>
      Kachpada, Malad (West), Mumbai – 400 064.<br>
      Tel: 022 3511 4041/5999/6000/6001 &nbsp;|&nbsp; Mobile: +91 9820155312<br>
      E-mail: smit.vora@jsvingredient.net &nbsp;|&nbsp; Website: www.jsvingredient.com
    </div>
    <div style="margin-top:6px;font-size:10px;">
      <strong>GSTIN: 27AABCJ1234P1ZV</strong> &nbsp;|&nbsp; PAN: AABCJ1234P &nbsp;|&nbsp; State: Maharashtra (27)
    </div>
  </div>
  <div class="inv-title-block">
    <div class="inv-title">TAX INVOICE</div>
    <table>
      <tr><td>Invoice No.</td><td>${inv.invoiceNo}</td></tr>
      <tr><td>Invoice Date</td><td>${inv.issueDate}</td></tr>
      <tr><td>Due Date</td><td>${inv.dueDate || '—'}</td></tr>
      <tr><td>Payment Terms</td><td>${inv.paymentTerms || '—'}</td></tr>
      <tr><td>Order Ref.</td><td>${order?.orderNo || '—'}</td></tr>
      <tr><td>Payment Mode</td><td>${inv.paymentMode || '—'}</td></tr>
    </table>
  </div>
</div>

<div class="parties">
  <div class="party-box">
    <div class="party-label">Bill To (Buyer)</div>
    <div class="party-name">${inv.company}</div>
    <div class="party-detail">
      Address: ___________________________________<br>
      City / State: ________________________________<br>
      GSTIN / UIN: ________________________________<br>
      PAN No.: ____________________________________
    </div>
  </div>
  <div class="party-box">
    <div class="party-label">Ship To (Delivery Address)</div>
    <div class="party-name">${inv.company}</div>
    <div class="party-detail">
      Warehouse: ${order?.warehouse || '—'}<br>
      Delivery Date: ${order?.delivery || '—'}<br>
      City / State: ________________________________<br>
      Transport / LR No.: __________________________
    </div>
  </div>
</div>

<table class="items-table">
  <thead>
    <tr>
      <th style="width:28px">Sr.</th>
      <th class="left">Description of Goods</th>
      <th style="width:58px">HSN/SAC</th>
      <th style="width:45px">Qty</th>
      <th style="width:32px">Unit</th>
      <th style="width:72px">Rate (₹)</th>
      <th style="width:72px">Taxable Value (₹)</th>
      ${isInterstate
        ? '<th style="width:40px">IGST%</th><th style="width:68px">IGST Amt (₹)</th>'
        : '<th style="width:35px">CGST%</th><th style="width:65px">CGST Amt (₹)</th><th style="width:35px">SGST%</th><th style="width:65px">SGST Amt (₹)</th>'
      }
      <th style="width:75px">Total (₹)</th>
    </tr>
  </thead>
  <tbody>
    ${lineItems.length > 0 ? lineItems.map((li, i) => {
      const amt = Number(li.qty || 0) * Number(li.unitPrice || 0)
      const gstAmt = Math.round(amt * 18 / 100)
      return `<tr>
        <td class="center">${i+1}</td>
        <td>${li.product || ''}</td>
        <td class="center">—</td>
        <td class="center">${li.qty || ''}</td>
        <td class="center">${li.unit || 'kg'}</td>
        <td class="right">${Number(li.unitPrice||0).toLocaleString('en-IN')}</td>
        <td class="right">${amt.toLocaleString('en-IN')}</td>
        ${isInterstate
          ? `<td class="center">18%</td><td class="right">${gstAmt.toLocaleString('en-IN')}</td>`
          : `<td class="center">9%</td><td class="right">${Math.round(gstAmt/2).toLocaleString('en-IN')}</td><td class="center">9%</td><td class="right">${Math.round(gstAmt/2).toLocaleString('en-IN')}</td>`
        }
        <td class="right"><strong>${(amt+gstAmt).toLocaleString('en-IN')}</strong></td>
      </tr>`
    }).join('') : `<tr>
      <td class="center">1</td>
      <td>As per Order ${order?.orderNo || ''}</td>
      <td class="center">—</td><td class="center">—</td><td class="center">—</td>
      <td class="right">${Number(inv.subtotal||0).toLocaleString('en-IN')}</td>
      <td class="right">${Number(inv.subtotal||0).toLocaleString('en-IN')}</td>
      ${isInterstate
        ? `<td class="center">18%</td><td class="right">${Number(inv.igst||0).toLocaleString('en-IN')}</td>`
        : `<td class="center">9%</td><td class="right">${Number(inv.cgst||0).toLocaleString('en-IN')}</td><td class="center">9%</td><td class="right">${Number(inv.sgst||0).toLocaleString('en-IN')}</td>`
      }
      <td class="right"><strong>${Number(inv.total||0).toLocaleString('en-IN')}</strong></td>
    </tr>`}
    <tr class="total-row">
      <td colspan="6" class="right" style="font-weight:bold;">TOTAL</td>
      <td class="right">${Number(inv.subtotal||0).toLocaleString('en-IN')}</td>
      ${isInterstate
        ? `<td></td><td class="right">${Number(inv.igst||0).toLocaleString('en-IN')}</td>`
        : `<td></td><td class="right">${Number(inv.cgst||0).toLocaleString('en-IN')}</td><td></td><td class="right">${Number(inv.sgst||0).toLocaleString('en-IN')}</td>`
      }
      <td class="right">${Number(inv.total||0).toLocaleString('en-IN')}</td>
    </tr>
  </tbody>
</table>

<div class="bottom-section">
  <div class="tax-summary">
    <div style="font-size:10px;font-weight:bold;margin-bottom:5px;">GST Tax Summary</div>
    <table>
      <tr>
        <th class="left">Taxable Amount</th>
        ${isInterstate ? '<th>IGST Rate</th><th>IGST Amount</th>' : '<th>CGST Rate</th><th>CGST Amount</th><th>SGST Rate</th><th>SGST Amount</th>'}
        <th>Total Tax</th>
      </tr>
      <tr>
        <td class="left">₹${Number(inv.subtotal||0).toLocaleString('en-IN')}</td>
        ${isInterstate
          ? `<td>18%</td><td>₹${Number(inv.igst||0).toLocaleString('en-IN')}</td>`
          : `<td>9%</td><td>₹${Number(inv.cgst||0).toLocaleString('en-IN')}</td><td>9%</td><td>₹${Number(inv.sgst||0).toLocaleString('en-IN')}</td>`
        }
        <td>₹${(Number(inv.cgst||0)+Number(inv.sgst||0)+Number(inv.igst||0)).toLocaleString('en-IN')}</td>
      </tr>
    </table>
    ${inv.notes ? `<div style="margin-top:8px;font-size:10px;"><strong>Remarks:</strong> ${inv.notes}</div>` : ''}
  </div>
  <div class="totals-box">
    <table>
      <tr><td>Subtotal</td><td>₹${Number(inv.subtotal||0).toLocaleString('en-IN')}</td></tr>
      ${Number(inv.cgst)>0?`<tr><td>CGST @ 9%</td><td>₹${Number(inv.cgst).toLocaleString('en-IN')}</td></tr>`:''}
      ${Number(inv.sgst)>0?`<tr><td>SGST @ 9%</td><td>₹${Number(inv.sgst).toLocaleString('en-IN')}</td></tr>`:''}
      ${Number(inv.igst)>0?`<tr><td>IGST @ 18%</td><td>₹${Number(inv.igst).toLocaleString('en-IN')}</td></tr>`:''}
      <tr><td>Round Off</td><td>₹0.00</td></tr>
      <tr class="grand"><td>GRAND TOTAL</td><td>₹${Number(inv.total||0).toLocaleString('en-IN')}</td></tr>
    </table>
  </div>
</div>

<div class="amount-words">
  <strong>Amount in Words:</strong> ${numberToWords(Number(inv.total||0))}
</div>

<div class="footer-section">
  <div class="bank-details">
    <strong>Bank Details for Payment:</strong>
    Bank Name: _________________________________ &nbsp;|&nbsp; Account No.: _______________________<br>
    IFSC Code: _________________________________ &nbsp;|&nbsp; Branch: ____________________________<br>
    Account Type: Current Account &nbsp;|&nbsp; Account Name: JSV Ingredient
  </div>
  <div class="sign-block">
    <div class="company-sign">For JSV INGREDIENT</div>
    <div class="sign-line">Authorised Signatory</div>
  </div>
</div>

<div class="terms">
  <strong>Terms &amp; Conditions:</strong>
  1. Goods once sold will not be taken back. &nbsp;|&nbsp;
  2. Interest @ 18% p.a. will be charged on overdue payments. &nbsp;|&nbsp;
  3. Subject to Mumbai jurisdiction only. &nbsp;|&nbsp;
  4. E. &amp; O.E. (Errors &amp; Omissions Excepted)
</div>

</div></body></html>`
  return html
}

function printInvoice(inv, order) {
  const html = buildInvoiceHTML(inv, order)
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 600)
}

export default function Invoices() {
  const { can } = useAuth()
  const canEdit = can('invoices', 'edit')
  const canDelete = can('invoices', 'delete')
  const [invoices, setInvoices] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState('All')
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === '1')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [previewInvoiceData, setPreviewInvoiceData] = useState(null) // { inv, order }
  const [historyInvoice, setHistoryInvoice] = useState(null)

  useEffect(() => { refresh() }, [])

  function refresh() {
    setLoading(true)
    Promise.all([api.invoices.list(), api.orders.list(), api.customers.list(), api.payments.list()]).then(([inv, ord, cust, pay]) => {
      setInvoices(inv); setOrders(ord); setCustomers(cust); setPayments(pay); setLoading(false)
    })
  }

  async function handleTallyImport(records) {
    let imported = 0
    for (const r of records) {
      try {
        await api.invoices.insert({
          ...r,
          invoiceNo: r.invoiceNo || `INV-TALLY-${Date.now()}-${imported}`,
        })
        imported++
      } catch {}
    }
    alert(`✅ Imported ${imported} invoices from Tally!`)
    refresh()
  }

  async function handleTallyExported(ids) {
    const syncedAt = new Date().toISOString()
    for (const id of ids) {
      try { await api.invoices.update(id, { tallySyncedAt: syncedAt }) } catch {}
    }
    refresh()
  }

  // Auto-generate invoice from an order
  function generateFromOrder(order) {
    const subtotal = Number(order.subtotal || order.total / 1.18 || 0)
    const gst = Number(order.gstAmount || (subtotal * 0.18))
    setForm({
      company: order.company,
      orderId: order.id,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: order.paymentDueDate || addDays(new Date().toISOString().slice(0, 10), 30),
      paymentTerms: order.paymentTerms || 'Net 30',
      subtotal: Math.round(subtotal),
      cgst: Math.round(gst / 2),
      sgst: Math.round(gst / 2),
      igst: 0,
      total: Math.round(subtotal + gst),
      status: 'Draft',
      paymentMode: '',
      notes: `Generated from order ${order.orderNo}`,
    })
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(inv) {
    setForm({ paymentTerms: 'Custom', ...inv })
    setEditingId(inv.id)
    setShowModal(true)
  }

  async function handleDelete(inv) {
    if (!confirm(`Delete invoice "${inv.invoiceNo}"? This cannot be undone.`)) return
    try {
      await api.invoices.remove(inv.id)
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
      prev.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id))
    )
  }

  function selectAllOverdue() {
    setSelected(new Set(invoices.filter((i) => isOverdueForReminder(i)).map((i) => i.id)))
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} invoice${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    try {
      await Promise.all([...selected].map((id) => api.invoices.remove(id)))
      setSelected(new Set())
      refresh()
      showToast(`${count} invoice${count === 1 ? '' : 's'} deleted`)
    } catch (err) {
      showToast('Could not delete selected invoices: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  function handleBulkExport() {
    const rows = filtered.filter((i) => selected.has(i.id))
    exportCSV(
      'Invoices',
      ['Invoice #', 'Company', 'Issue Date', 'Due Date', 'Subtotal', 'CGST', 'SGST', 'Total', 'Status'],
      rows.map((i) => [i.invoiceNo, i.company, i.issueDate, i.dueDate, i.subtotal, i.cgst, i.sgst, i.total, i.status])
    )
  }

  // Builds one row per company (not per invoice) so a customer with
  // several overdue invoices gets a single reminder covering their full
  // outstanding balance, using the same math Payments/Customers use.
  const reminderRows = useMemo(() => {
    const selectedOverdue = invoices.filter((i) => selected.has(i.id) && isOverdueForReminder(i))
    const byCompany = new Map()
    selectedOverdue.forEach((inv) => {
      if (!byCompany.has(inv.company)) byCompany.set(inv.company, 0)
      byCompany.set(inv.company, byCompany.get(inv.company) + 1)
    })
    return [...byCompany.entries()].map(([company, invoiceCount]) => {
      const customer = customers.find((c) => c.company === company)
      return {
        company,
        invoiceCount,
        phone: customer?.mobile,
        email: customer?.email,
        outstanding: outstandingForCustomer(company, invoices, payments),
      }
    })
  }, [invoices, payments, customers, selected])

  function recalcGST(subtotal) {
    const sub = Number(subtotal) || 0
    const gst = Math.round(sub * GST_RATE / 100)
    setForm((f) => ({ ...f, subtotal: sub, cgst: Math.round(gst / 2), sgst: Math.round(gst / 2), igst: 0, total: sub + gst }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const invNo = editingId ? form.invoiceNo : `INV-2026-${String(40 + invoices.length + 1).padStart(4, '0')}`
      const record = { ...form, invoiceNo: invNo }
      if (editingId) await api.invoices.update(editingId, record)
      else await api.invoices.insert(record)
      setShowModal(false)
      setForm(emptyForm())
      setEditingId(null)
      refresh()
    } catch (err) {
      alert('Could not save: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => invoices.filter((inv) => {
    const matchSearch = !search || [inv.invoiceNo, inv.company].some((v) => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter
    const matchOverdue = !overdueOnly || isInvoiceOverdue(inv)
    return matchSearch && matchStatus && matchOverdue
  }), [invoices, search, statusFilter, overdueOnly])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  useEffect(() => { setPage(1) }, [search, statusFilter, overdueOnly])
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  const totalPaid = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const totalOverdue = invoices.filter((i) => i.status === 'Overdue').reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPending = invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled' && i.status !== 'Overdue').reduce((s, i) => s + Number(i.total || 0), 0)

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <TallyImportButton onImport={handleTallyImport} />
            {canEdit && <TallyExportButton invoices={invoices} onExported={handleTallyExported} />}
            <ExportBar
              title="Invoices"
              headers={['Invoice #', 'Company', 'Issue Date', 'Due Date', 'Subtotal', 'CGST', 'SGST', 'Total', 'Status']}
              rows={filtered.map((i) => [i.invoiceNo, i.company, i.issueDate, i.dueDate, i.subtotal, i.cgst, i.sgst, i.total, i.status])}
              count={filtered.length}
            />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setEditingId(null); setShowModal(true) }}>
                <IconPlus width={15} height={15} /> New Invoice
              </button>
            )}
          </div>
        }
      />

      {/* Summary cards */}
      <div className="stat-grid">
        <StatCard icon={IconReceipt} tone="blue" label="Total Invoiced" value={formatINR(invoices.reduce((s, i) => s + Number(i.total || 0), 0))} mono />
        <StatCard icon={IconDollarSign} tone="teal" label="Paid" value={formatINR(totalPaid)} mono />
        <StatCard icon={IconClock} tone="amber" label="Pending" value={formatINR(totalPending)} mono />
        <StatCard icon={IconFlame} tone="red" label="Overdue" value={formatINR(totalOverdue)} mono />
      </div>

      {/* Auto-generate from order */}
      {canEdit && orders.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p className="panel-title" style={{ marginBottom: 10 }}>⚡ Generate invoice from order</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {orders.filter((o) => !invoices.find((i) => i.orderId === o.id)).map((o) => (
              <button key={o.id} className="btn btn-secondary btn-sm" onClick={() => generateFromOrder(o)}>
                {o.orderNo} — {o.company}
              </button>
            ))}
            {orders.every((o) => invoices.find((i) => i.orderId === o.id)) && (
              <span style={{ fontSize: 13, color: 'var(--ink-400)' }}>All orders have invoices.</span>
            )}
          </div>
        </div>
      )}

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch width={15} height={15} />
          <input placeholder="Search invoice #, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button
          type="button"
          className={`btn btn-sm ${overdueOnly ? 'btn-primary' : 'btn-ghost-light'}`}
          onClick={() => setOverdueOnly((v) => !v)}
        >
          {overdueOnly ? '✓ Overdue only' : 'Overdue only'}
        </button>
        {invoices.some((i) => isOverdueForReminder(i)) && (
          <button type="button" className="btn btn-ghost-light" onClick={selectAllOverdue}>
            Select all overdue
          </button>
        )}
      </div>

      <BulkActionsBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onExport={handleBulkExport}
        onDelete={canDelete ? handleBulkDelete : undefined}
      >
        <button type="button" className="btn btn-ghost-light" onClick={() => setShowReminderModal(true)}>
          📨 Send Payment Reminders
        </button>
      </BulkActionsBar>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="header-checkbox-cell">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Invoice #</th><th>Company</th><th>Issue Date</th><th>Due Date</th>
              <th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={10}>Loading invoices…</td></tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={10}>
                {invoices.length === 0 ? (
                  <EmptyState
                    icon="🧾"
                    title="No invoices yet"
                    subtitle="Generate one from an order using the panel above."
                  />
                ) : (
                  <EmptyState icon="🔍" title="No invoices match your filters" subtitle="Try adjusting your search or filters." />
                )}
              </td></tr>
            ) : paged.map((inv) => {
              const customer = customers.find((c) => c.company === inv.company)
              return (
              <tr key={inv.id}>
                <td className="row-checkbox-cell">
                  <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelected(inv.id)} />
                </td>
                <td className="cell-mono cell-strong">
                  {inv.invoiceNo}
                  {inv.tallySyncedAt && <span title={`Exported to Tally on ${String(inv.tallySyncedAt).slice(0, 10)}`} style={{ marginLeft: 6, fontSize: 11, color: 'var(--teal-700)' }}>⇄ Tally</span>}
                </td>
                <td className="cell-strong">{inv.company}</td>
                <td className="cell-mono">{inv.issueDate}</td>
                <td className="cell-mono" style={{ color: inv.status === 'Overdue' ? 'var(--red-600)' : undefined }}>
                  {inv.dueDate}
                  {inv.paymentTerms && <><br /><span className="cell-mono cell-muted" style={{ fontSize: 11 }}>{inv.paymentTerms}</span></>}
                </td>
                <td className="cell-mono">{formatINR(inv.subtotal)}</td>
                <td className="cell-mono">{formatINR(Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0))}</td>
                <td className="cell-mono cell-strong">{formatINR(inv.total)}</td>
                <td><Pill>{inv.status}</Pill></td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <SendButtons
                    phone={customer?.mobile}
                    email={customer?.email}
                    category="invoice"
                    vars={{ company: inv.company, invoiceNo: inv.invoiceNo, total: formatINR(inv.total), dueDate: inv.dueDate }}
                  />
                  <RowActionsMenu
                    items={[
                      canEdit && { label: 'Edit', icon: <IconEdit width={13} height={13} />, onClick: () => openEdit(inv) },
                      { label: 'Preview PDF', icon: '👁', onClick: () => setPreviewInvoiceData({ inv, order: orders.find((o) => o.id === inv.orderId) }) },
                      { label: 'Print / Save as PDF', icon: '🖨', onClick: () => printInvoice(inv, orders.find((o) => o.id === inv.orderId)) },
                      { label: 'Payment history', icon: '📜', onClick: () => setHistoryInvoice(inv) },
                      canDelete && 'divider',
                      canDelete && { label: 'Delete', icon: <IconTrash width={13} height={13} />, danger: true, onClick: () => handleDelete(inv) },
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
          title={editingId ? 'Edit Invoice' : 'New Invoice'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" form="invoice-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save invoice'}
              </button>
            </>
          }
        >
          <form id="invoice-form" onSubmit={handleSave}>
            <div className="field">
              <label>Company</label>
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Issue date</label>
                <input
                  type="date" required value={form.issueDate}
                  onChange={(e) => {
                    const issueDate = e.target.value
                    const days = termsToDays(form.paymentTerms)
                    setForm((f) => ({ ...f, issueDate, dueDate: days != null ? addDays(issueDate, days) : f.dueDate }))
                  }}
                />
              </div>
              <div className="field">
                <label>Payment terms</label>
                <Dropdown
                  options={PAYMENT_TERMS}
                  value={form.paymentTerms || 'Custom'}
                  onChange={(paymentTerms) => {
                    const days = termsToDays(paymentTerms)
                    setForm((f) => ({ ...f, paymentTerms, dueDate: days != null ? addDays(f.issueDate, days) : f.dueDate }))
                  }}
                />
              </div>
            </div>
            <div className="field">
              <label>Due date {form.paymentTerms !== 'Custom' && <span style={{ fontWeight: 400, color: 'var(--ink-400)' }}>(auto-calculated from payment terms — you can still adjust it)</span>}</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="field">
              <label>Subtotal (₹) — GST calculated automatically</label>
              <input type="number" min="0" value={form.subtotal} onChange={(e) => recalcGST(e.target.value)} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>CGST (9%) ₹</label>
                <input type="number" min="0" value={form.cgst} onChange={(e) => setForm({ ...form, cgst: Number(e.target.value), total: Number(form.subtotal) + Number(e.target.value) + Number(form.sgst) + Number(form.igst) })} />
              </div>
              <div className="field">
                <label>SGST (9%) ₹</label>
                <input type="number" min="0" value={form.sgst} onChange={(e) => setForm({ ...form, sgst: Number(e.target.value), total: Number(form.subtotal) + Number(form.cgst) + Number(e.target.value) + Number(form.igst) })} />
              </div>
              <div className="field">
                <label>IGST (18%) ₹</label>
                <input type="number" min="0" value={form.igst} onChange={(e) => setForm({ ...form, igst: Number(e.target.value), total: Number(form.subtotal) + Number(form.cgst) + Number(form.sgst) + Number(e.target.value) })} />
              </div>
            </div>
            <div className="field">
              <label>Total (₹)</label>
              <input type="number" min="0" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Payment mode</label>
                <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                  <option value="">— Select —</option>
                  {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}

      {previewInvoiceData && (
        <Modal
          title={`Preview — ${previewInvoiceData.inv.invoiceNo}`}
          onClose={() => setPreviewInvoiceData(null)}
          size="lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPreviewInvoiceData(null)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => printInvoice(previewInvoiceData.inv, previewInvoiceData.order)}
              >
                🖨 Print / Save as PDF
              </button>
            </>
          }
        >
          <iframe
            title="Invoice PDF preview"
            srcDoc={buildInvoiceHTML(previewInvoiceData.inv, previewInvoiceData.order)}
            style={{ width: '100%', height: '72vh', border: '1px solid var(--paper-200)', borderRadius: 8, background: '#fff' }}
          />
        </Modal>
      )}

      {historyInvoice && (() => {
        const invoicePayments = payments
          .filter((p) => p.invoiceId === historyInvoice.id)
          .sort((a, b) => (a.date < b.date ? 1 : -1))
        const totalPaid = invoicePayments.filter((p) => p.status === 'Completed').reduce((s, p) => s + Number(p.amount || 0), 0)
        const balance = Math.max(0, Number(historyInvoice.total || 0) - totalPaid)
        return (
          <Modal title={`Payment History — ${historyInvoice.invoiceNo}`} onClose={() => setHistoryInvoice(null)}>
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
              <StatCard icon={IconReceipt} tone="blue" label="Invoice Total" value={formatINR(historyInvoice.total)} mono />
              <StatCard icon={IconDollarSign} tone="teal" label="Paid" value={formatINR(totalPaid)} mono />
              <StatCard icon={IconClock} tone={balance > 0 ? 'amber' : 'teal'} label="Balance Due" value={formatINR(balance)} mono />
            </div>
            {invoicePayments.length === 0 ? (
              <EmptyState icon="💳" title="No payments recorded yet" subtitle="Payments logged against this invoice from the Payments page will show up here." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Payment #</th><th>Date</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {invoicePayments.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-mono cell-strong">{p.paymentNo}</td>
                      <td className="cell-mono">{p.date}</td>
                      <td className="cell-mono">{formatINR(p.amount)}</td>
                      <td>{p.mode}</td>
                      <td className="cell-mono">{p.reference || <span className="cell-muted">—</span>}</td>
                      <td><Pill>{p.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Modal>
        )
      })()}

      <BulkReminderModal
        open={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        rows={reminderRows}
        onDone={() => setSelected(new Set())}
      />
    </div>
  )
}
