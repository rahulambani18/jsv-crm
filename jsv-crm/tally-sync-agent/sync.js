// tally-sync-agent/sync.js
//
// Polls Tally's local XML server for Sales / Tax Invoice vouchers and
// inserts any new ones into the JSV CRM's Supabase `invoices` table.
//
// This runs as a small standalone Node.js process — separate from the
// CRM website itself — because it needs to sit on the same network as
// Tally (Tally has no way to "push" data out on its own). See README.md
// in this folder for full setup instructions.

import 'dotenv/config'
import { DOMParser } from '@xmldom/xmldom'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TALLY_URL = 'http://localhost:9000',
  TALLY_COMPANY = '',
  SYNC_DAYS_BACK = '1',
  POLL_INTERVAL_SECONDS = '60',
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[fatal] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — see .env.example')
  process.exit(1)
}

const RUN_ONCE = process.argv.includes('--once')

// ── XML helpers (same approach as src/lib/tallyImport.js, adapted for ──
// ── the xmldom parser used in Node instead of the browser DOMParser) ──
function getText(el, tag) {
  const node = el.getElementsByTagName(tag)[0]
  return node ? (node.textContent || '').trim() : ''
}

function getAll(el, tag) {
  return Array.from(el.getElementsByTagName(tag))
}

function parseAmount(str) {
  if (!str) return 0
  return Math.abs(parseFloat(String(str).replace(/[^0-9.-]/g, '')) || 0)
}

function parseTallyDate(str) {
  if (!str || str.length !== 8) return ''
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
}

function todayMinus(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function todayTally() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

// ── Build the Tally XML request for a Day Book export ──────────────
function buildRequestXML(fromDate, toDate) {
  const companyTag = TALLY_COMPANY ? `<SVCURRENTCOMPANY>${escapeXML(TALLY_COMPANY)}</SVCURRENTCOMPANY>` : ''
  return `<ENVELOPE>
 <HEADER>
  <TALLYREQUEST>Export Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <EXPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Day Book</REPORTNAME>
    <STATICVARIABLES>
     <SVFROMDATE>${fromDate}</SVFROMDATE>
     <SVTODATE>${toDate}</SVTODATE>
     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
     ${companyTag}
    </STATICVARIABLES>
   </REQUESTDESC>
  </EXPORTDATA>
 </BODY>
</ENVELOPE>`
}

function escapeXML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Parse Sales Vouchers → Invoice records (mirrors tallyImport.js) ──
function parseInvoicesFromXML(xmlText) {
  const doc = new DOMParser({
    errorHandler: { warning: () => {}, error: () => {}, fatalError: (e) => { throw new Error(e) } },
  }).parseFromString(xmlText, 'text/xml')

  const vouchers = getAll(doc, 'VOUCHER')
  return vouchers
    .filter((v) => {
      const type = getText(v, 'VOUCHERTYPENAME').toLowerCase()
      return type.includes('sales') || type.includes('tax invoice') || type.includes('invoice')
    })
    .map((v) => {
      const allLedgerEntries = getAll(v, 'ALLLEDGERENTRIES')
      const ledgerEntries = getAll(v, 'LEDGERENTRIES')
      const entries = [...allLedgerEntries, ...ledgerEntries]

      const partyName = getText(v, 'PARTYNAME') || getText(v, 'BASICBUYERNAME') || ''

      const cgstEntry = entries.find((e) => getText(e, 'LEDGERNAME').toLowerCase().includes('cgst'))
      const sgstEntry = entries.find((e) => getText(e, 'LEDGERNAME').toLowerCase().includes('sgst'))
      const igstEntry = entries.find((e) => getText(e, 'LEDGERNAME').toLowerCase().includes('igst'))

      const total = parseAmount(getText(v, 'AMOUNT') || '0')
      const cgst = cgstEntry ? parseAmount(getText(cgstEntry, 'AMOUNT')) : 0
      const sgst = sgstEntry ? parseAmount(getText(sgstEntry, 'AMOUNT')) : 0
      const igst = igstEntry ? parseAmount(getText(igstEntry, 'AMOUNT')) : 0
      const subtotal = total - cgst - sgst - igst

      return {
        invoice_no: getText(v, 'VOUCHERNUMBER') || getText(v, 'REFERENCE') || '',
        company: partyName,
        issue_date: parseTallyDate(getText(v, 'DATE') || getText(v, 'VOUCHERDATE')),
        due_date: null,
        payment_terms: 'Net 30',
        subtotal: Math.round(subtotal),
        cgst: Math.round(cgst),
        sgst: Math.round(sgst),
        igst: Math.round(igst),
        total: Math.round(total),
        status: 'Unpaid',
        payment_mode: null,
        notes: `Synced from Tally — ${getText(v, 'NARRATION') || ''}`.trim().slice(0, 500),
        source: 'Tally Sync',
      }
    })
    .filter((inv) => inv.company && inv.invoice_no && inv.total > 0)
}

// ── Talk to Tally ────────────────────────────────────────────────────
async function fetchFromTally(fromDate, toDate) {
  const res = await fetch(TALLY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: buildRequestXML(fromDate, toDate),
  })
  if (!res.ok) {
    throw new Error(`Tally returned HTTP ${res.status}. Is Tally open with the XML server enabled?`)
  }
  return res.text()
}

// ── Talk to Supabase (REST API, using the service role key) ────────
async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : undefined,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Supabase ${options.method || 'GET'} ${path} failed: HTTP ${res.status} ${body}`)
  }
  return res.json()
}

async function invoiceAlreadyExists(invoiceNo) {
  const rows = await supabaseFetch(
    `invoices?invoice_no=eq.${encodeURIComponent(invoiceNo)}&select=id&limit=1`
  )
  return rows.length > 0
}

async function insertInvoice(invoice) {
  await supabaseFetch('invoices', {
    method: 'POST',
    body: JSON.stringify(invoice),
  })
}

// ── One sync pass ────────────────────────────────────────────────────
async function runOnce() {
  const from = todayMinus(Number(SYNC_DAYS_BACK) || 1)
  const to = todayTally()
  const ts = new Date().toLocaleString('en-IN')

  try {
    const xml = await fetchFromTally(from, to)
    const invoices = parseInvoicesFromXML(xml)

    let created = 0
    for (const inv of invoices) {
      const exists = await invoiceAlreadyExists(inv.invoice_no)
      if (exists) continue
      await insertInvoice(inv)
      created++
      console.log(`[${ts}] + synced invoice ${inv.invoice_no} — ${inv.company} — ₹${inv.total}`)
    }

    if (created === 0) {
      console.log(`[${ts}] checked ${invoices.length} voucher(s), nothing new`)
    }
  } catch (err) {
    console.error(`[${ts}] sync error:`, err.message)
  }
}

// ── Entry point ──────────────────────────────────────────────────────
console.log(`JSV CRM ⇄ Tally sync agent starting`)
console.log(`  Tally server:  ${TALLY_URL}`)
console.log(`  Supabase:      ${SUPABASE_URL}`)
console.log(`  Poll interval: ${POLL_INTERVAL_SECONDS}s`)

runOnce()

if (!RUN_ONCE) {
  setInterval(runOnce, Number(POLL_INTERVAL_SECONDS) * 1000)
}
