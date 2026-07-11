// src/lib/tallyImport.js
// Parses Tally XML exports and converts them to CRM-friendly objects.
//
// HOW TO EXPORT FROM TALLY:
//
// For CUSTOMERS (Ledgers):
//   Gateway of Tally → Display → List of Accounts → E: Export
//   Format: XML → Export
//
// For INVOICES (Sales Vouchers):
//   Gateway of Tally → Display → Day Book → F2: Period (set date range)
//   E: Export → Format: XML → Select "Sales" voucher type → Export
//
// For PAYMENTS (Receipt Vouchers):
//   Gateway of Tally → Display → Day Book
//   E: Export → Format: XML → Select "Receipt" voucher type → Export
//
// Then upload the exported .xml file in the CRM import dialog.

// ── XML parsing helpers ─────────────────────────────────────────────
function getText(el, tag) {
  const node = el.querySelector(tag) || el.getElementsByTagName(tag)[0]
  return node ? node.textContent.trim() : ''
}

function getAll(el, tag) {
  return Array.from(el.getElementsByTagName(tag))
}

function parseAmount(str) {
  if (!str) return 0
  // Tally amounts can be "12345.67 Dr" or "-12345.67" or "12,345.67"
  return Math.abs(parseFloat(str.replace(/[^0-9.-]/g, '')) || 0)
}

function parseTallyDate(str) {
  // Tally date format: YYYYMMDD → YYYY-MM-DD
  if (!str || str.length !== 8) return ''
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
}

// ── Detect what type of Tally XML this is ──────────────────────────
function detectType(doc) {
  const hasLedger = doc.getElementsByTagName('LEDGER').length > 0
  const vouchers = getAll(doc, 'VOUCHER')
  const voucherTypes = new Set(vouchers.map((v) => getText(v, 'VOUCHERTYPENAME').toLowerCase()))

  if (hasLedger && vouchers.length === 0) return 'ledgers'
  if (voucherTypes.has('sales') || voucherTypes.has('tax invoice')) return 'invoices'
  if (voucherTypes.has('receipt')) return 'payments'
  if (voucherTypes.has('payment')) return 'payments'
  if (hasLedger) return 'ledgers'
  return 'unknown'
}

// ── Parse Ledgers → Customers ───────────────────────────────────────
function parseLedgers(doc) {
  const ledgers = getAll(doc, 'LEDGER')
  return ledgers
    .filter((l) => {
      const parent = getText(l, 'PARENT').toLowerCase()
      // Only import customer/debtor ledgers, skip bank/expense/income accounts
      return parent.includes('sundry debtor') ||
             parent.includes('debtor') ||
             parent.includes('customer') ||
             parent.includes('trade receivable')
    })
    .map((l) => {
      const addresses = getAll(l, 'ADDRESS')
      const addressParts = addresses.map((a) => a.textContent.trim()).filter(Boolean)
      return {
        company: getText(l, 'NAME') || l.getAttribute('NAME') || '',
        contact: getText(l, 'CONTACTPERSON') || getText(l, 'LEDCONTACTNAME') || '',
        mobile: getText(l, 'LEDMOBILE') || getText(l, 'MOBILENUMBER') || '',
        email: getText(l, 'EMAIL') || getText(l, 'LEDEMAIL') || '',
        gst: getText(l, 'PARTYGSTIN') || getText(l, 'GSTIN') || getText(l, 'LEDGSTIN') || '',
        city: getText(l, 'LEDCITY') || '',
        state: getText(l, 'LEDSTATE') || getText(l, 'STATENAME') || '',
        billingAddress: addressParts.join(', '),
        industry: '',
        application: '',
        added: new Date().toISOString().slice(0, 10),
        _source: 'Tally Import',
      }
    })
    .filter((c) => c.company) // must have a name
}

// ── Parse Sales Vouchers → Invoices ────────────────────────────────
function parseInvoices(doc) {
  const vouchers = getAll(doc, 'VOUCHER')
  return vouchers
    .filter((v) => {
      const type = getText(v, 'VOUCHERTYPENAME').toLowerCase()
      return type.includes('sales') || type.includes('tax invoice') || type.includes('invoice')
    })
    .map((v) => {
      // Find the party ledger (customer) — it's the ledger in the accounting entries
      const allLedgerEntries = getAll(v, 'ALLLEDGERENTRIES') 
      const ledgerEntries = getAll(v, 'LEDGERENTRIES')
      const entries = [...allLedgerEntries, ...ledgerEntries]
      
      // Party name is usually the first ledger entry or PARTYNAME tag
      const partyName = getText(v, 'PARTYNAME') || getText(v, 'BASICBUYERNAME') || ''
      
      // Get line items if available
      const inventoryEntries = getAll(v, 'INVENTORYENTRIES').concat(getAll(v, 'ALLINVENTORYENTRIES'))
      const lineItems = inventoryEntries.map((item) => ({
        product: getText(item, 'STOCKITEMNAME') || getText(item, 'STOCKITEM') || '',
        qty: parseFloat(getText(item, 'ACTUALQTY') || getText(item, 'BILLEDQTY') || '0'),
        unit: getText(item, 'GSTOVRDNUNITNAME') || getText(item, 'UNIT') || 'kg',
        unitPrice: parseAmount(getText(item, 'RATE') || getText(item, 'NORMALRATE') || '0'),
        lineTotal: parseAmount(getText(item, 'AMOUNT') || '0'),
      }))

      // Tax entries
      const cgstEntry = entries.find((e) => getText(e, 'LEDGERNAME').toLowerCase().includes('cgst'))
      const sgstEntry = entries.find((e) => getText(e, 'LEDGERNAME').toLowerCase().includes('sgst'))
      const igstEntry = entries.find((e) => getText(e, 'LEDGERNAME').toLowerCase().includes('igst'))

      const total = parseAmount(getText(v, 'AMOUNT') || '0')
      const cgst = cgstEntry ? parseAmount(getText(cgstEntry, 'AMOUNT')) : 0
      const sgst = sgstEntry ? parseAmount(getText(sgstEntry, 'AMOUNT')) : 0
      const igst = igstEntry ? parseAmount(getText(igstEntry, 'AMOUNT')) : 0
      const subtotal = total - cgst - sgst - igst

      return {
        invoiceNo: getText(v, 'VOUCHERNUMBER') || getText(v, 'REFERENCE') || '',
        company: partyName,
        issueDate: parseTallyDate(getText(v, 'DATE') || getText(v, 'VOUCHERDATE')),
        dueDate: parseTallyDate(getText(v, 'DUEDATE') || getText(v, 'BILLDATE') || ''),
        subtotal: Math.round(subtotal),
        cgst: Math.round(cgst),
        sgst: Math.round(sgst),
        igst: Math.round(igst),
        total: Math.round(total),
        status: 'Unpaid',
        paymentMode: '',
        notes: `Imported from Tally — ${getText(v, 'NARRATION') || ''}`.trim(),
        lineItems: lineItems.length > 0 ? lineItems : undefined,
        _source: 'Tally Import',
      }
    })
    .filter((inv) => inv.company && inv.total > 0)
}

// ── Parse Receipt Vouchers → Payments ──────────────────────────────
function parsePayments(doc) {
  const vouchers = getAll(doc, 'VOUCHER')
  return vouchers
    .filter((v) => {
      const type = getText(v, 'VOUCHERTYPENAME').toLowerCase()
      return type.includes('receipt')
    })
    .map((v) => {
      const partyName = getText(v, 'PARTYNAME') || ''
      const narration = getText(v, 'NARRATION') || ''
      
      // Detect payment mode from narration or bank ledger name
      const entries = getAll(v, 'ALLLEDGERENTRIES').concat(getAll(v, 'LEDGERENTRIES'))
      const bankEntry = entries.find((e) => {
        const name = getText(e, 'LEDGERNAME').toLowerCase()
        return name.includes('bank') || name.includes('hdfc') || name.includes('icici') ||
               name.includes('sbi') || name.includes('axis') || name.includes('kotak')
      })
      const mode = bankEntry ? 'NEFT' : (narration.toLowerCase().includes('upi') ? 'UPI' : 'Cash')
      
      // Extract UTR/reference from narration
      const utrMatch = narration.match(/[A-Z0-9]{12,25}/)
      const reference = utrMatch ? utrMatch[0] : ''

      return {
        company: partyName,
        amount: parseAmount(getText(v, 'AMOUNT') || '0'),
        date: parseTallyDate(getText(v, 'DATE') || getText(v, 'VOUCHERDATE')),
        mode,
        reference,
        notes: `Imported from Tally — ${narration}`.trim().slice(0, 200),
        status: 'Completed',
        _source: 'Tally Import',
      }
    })
    .filter((p) => p.company && p.amount > 0)
}

// ── Main entry point ────────────────────────────────────────────────
export async function parseTallyXML(file) {
  const text = await file.text()
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  
  // Check for XML parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Invalid XML file. Please export from Tally in XML format and try again.')
  }

  const type = detectType(doc)

  switch (type) {
    case 'ledgers':
      return { type: 'customers', records: parseLedgers(doc) }
    case 'invoices':
      return { type: 'invoices', records: parseInvoices(doc) }
    case 'payments':
      return { type: 'payments', records: parsePayments(doc) }
    default:
      throw new Error(
        'Could not detect the type of Tally export. ' +
        'Please export Ledgers (for customers), Sales vouchers (for invoices), ' +
        'or Receipt vouchers (for payments).'
      )
  }
}
