// src/lib/tallyExport.js
// Converts CRM invoices into a Tally "Import Data" XML envelope, the
// counterpart to tallyImport.js. This is the manual/offline half of
// two-way Tally sync: it produces a .xml file the rep downloads and
// then imports into Tally themselves (Gateway of Tally → Import Data →
// Vouchers). The automatic half — pushing straight into Tally over the
// network without a manual file trip — lives in tally-sync-agent/sync.js,
// since only a program running on the same LAN as Tally can reach its
// local XML server (a browser tab can't, whether the CRM is opened from
// a laptop, a phone, or hosted on the internet).
//
// HOW TO IMPORT THE DOWNLOADED FILE INTO TALLY:
//   Gateway of Tally → Import Data → Vouchers → select the .xml file
//
// IMPORTANT: Tally will only accept the voucher if the ledger names
// below (party name, sales, CGST, SGST, IGST) match ledgers that
// already exist in the target Tally company EXACTLY, character for
// character. There is no universal default — every company's chart of
// accounts is set up differently — so the ledger names are passed in
// rather than hard-coded, and the export dialog lets a rep override
// them and remembers the last values used (see TallyExportButton.jsx).

function escapeXML(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toTallyDate(iso) {
  // 'YYYY-MM-DD' -> 'YYYYMMDD'
  return String(iso || '').replace(/-/g, '')
}

// One <VOUCHER> block per invoice. Amounts: the party ledger is debited
// (positive from the customer's point of view, but Tally convention for
// a Sales voucher records the party as a negative/debit ledger entry and
// income/tax ledgers as positive credits) — this mirrors the structure
// Tally itself produces when exporting a Sales voucher, so a round trip
// through tallyImport.js's parseInvoices() reads it back consistently.
function buildVoucherXML(inv, ledgers) {
  const { salesLedger, cgstLedger, sgstLedger, igstLedger } = ledgers
  const entries = []

  entries.push(`      <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(inv.company)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${Number(inv.total || 0).toFixed(2)}</AMOUNT>
      </LEDGERENTRIES.LIST>`)

  if (Number(inv.subtotal) > 0) {
    entries.push(`      <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(salesLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${Number(inv.subtotal).toFixed(2)}</AMOUNT>
      </LEDGERENTRIES.LIST>`)
  }
  if (Number(inv.cgst) > 0) {
    entries.push(`      <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(cgstLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${Number(inv.cgst).toFixed(2)}</AMOUNT>
      </LEDGERENTRIES.LIST>`)
  }
  if (Number(inv.sgst) > 0) {
    entries.push(`      <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(sgstLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${Number(inv.sgst).toFixed(2)}</AMOUNT>
      </LEDGERENTRIES.LIST>`)
  }
  if (Number(inv.igst) > 0) {
    entries.push(`      <LEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(igstLedger)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${Number(inv.igst).toFixed(2)}</AMOUNT>
      </LEDGERENTRIES.LIST>`)
  }

  return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER VCHTYPE="Sales" ACTION="Create">
      <DATE>${toTallyDate(inv.issueDate)}</DATE>
      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${escapeXML(inv.invoiceNo)}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${escapeXML(inv.company)}</PARTYLEDGERNAME>
      <NARRATION>${escapeXML(inv.notes || `Exported from JSV CRM — ${inv.invoiceNo}`)}</NARRATION>
${entries.join('\n')}
     </VOUCHER>
    </TALLYMESSAGE>`
}

// ledgers: { salesLedger, cgstLedger, sgstLedger, igstLedger, companyName? }
export function buildTallyExportXML(invoices, ledgers) {
  const companyTag = ledgers.companyName
    ? `\n     <SVCURRENTCOMPANY>${escapeXML(ledgers.companyName)}</SVCURRENTCOMPANY>`
    : ''
  const messages = invoices.map((inv) => buildVoucherXML(inv, ledgers)).join('\n')
  return `<ENVELOPE>
 <HEADER>
  <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
    <STATICVARIABLES>${companyTag}
    </STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
${messages}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>
`
}

export function downloadTallyExportXML(invoices, ledgers) {
  const xml = buildTallyExportXML(invoices, ledgers)
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `tally-export-invoices-${stamp}.xml`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Ledger names vary per company's Tally chart of accounts, so remember
// the last values a rep entered (per browser) instead of re-asking
// every time.
const LEDGER_STORAGE_KEY = 'jsv_tally_export_ledgers'

export function loadSavedLedgerNames() {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveLedgerNames(ledgers) {
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledgers))
  } catch {
    // best-effort only
  }
}
