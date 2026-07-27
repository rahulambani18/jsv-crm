// excel-stock-sync-agent/sync.js
//
// Watches a local/shared stock Excel (or CSV) file and pushes the
// current quantities straight into the JSV CRM's Supabase `stock`
// table — no manual "Import" click needed.
//
// This runs as a small standalone Node.js process — separate from the
// CRM website itself — because the CRM is a website and has no way to
// reach into a file sitting on your PC or office network on its own.
// Something has to sit next to the file and watch it. See README.md
// in this folder for full setup instructions.

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import chokidar from 'chokidar'
import * as XLSX from 'xlsx'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  STOCK_FILE_PATH,
  SHEET_NAME = '',
  POLL_INTERVAL_SECONDS = '30',
  LOG_MOVEMENTS = 'true',
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[fatal] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — see .env.example')
  process.exit(1)
}
if (!STOCK_FILE_PATH) {
  console.error('[fatal] Missing STOCK_FILE_PATH in .env — see .env.example')
  process.exit(1)
}

const RUN_ONCE = process.argv.includes('--once')
const DEFAULT_WORKSPACE = '00000000-0000-0000-0000-000000000001' // same default workspace the CRM itself uses

// ── Reading & normalizing the spreadsheet ───────────────────────────
// Mirrors src/lib/fileImport.js's normalizeRow() so a column named
// "Product Name", "product_name", or "SKU" all map the same way,
// whatever the person who maintains the Excel file happens to call it.
const FIELD_ALIASES = {
  product: ['product', 'productname', 'item', 'itemname', 'sku', 'productcode'],
  warehouse: ['warehouse', 'location', 'godown', 'store', 'branch'],
  unit: ['unit', 'uom', 'units'],
  qty: ['qty', 'quantity', 'qtyonhand', 'closingstock', 'currentstock', 'availableqty', 'stock', 'stockqty', 'onhand'],
  reorderLevel: ['reorderlevel', 'reorderqty', 'minstock', 'minimumstock', 'reorderpoint'],
}

function normalizeRow(row) {
  const out = {}
  const rowKeysLower = Object.fromEntries(
    Object.keys(row).map((k) => [k.toLowerCase().replace(/[\s_]/g, ''), k])
  )
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const match = aliases.find((alias) => rowKeysLower[alias])
    if (match) out[field] = row[rowKeysLower[match]]
  }
  return out
}

function readStockFile(filePath) {
  const workbook = XLSX.readFile(filePath)
  const sheetName = SHEET_NAME && workbook.SheetNames.includes(SHEET_NAME)
    ? SHEET_NAME
    : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return rows
    .map(normalizeRow)
    .filter((r) => r.product && r.warehouse && r.qty !== '' && r.qty !== undefined)
    .map((r) => ({
      product: String(r.product).trim(),
      warehouse: String(r.warehouse).trim(),
      unit: r.unit ? String(r.unit).trim() : 'kg',
      qty_on_hand: Number(r.qty) || 0,
      reorder_level: r.reorderLevel !== undefined && r.reorderLevel !== '' ? Number(r.reorderLevel) || 0 : undefined,
    }))
}

// ── Talk to Supabase (REST API, using the service role key) ────────
async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Supabase ${options.method || 'GET'} ${path} failed: HTTP ${res.status} ${body}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function fetchExistingStock() {
  const rows = await supabaseFetch(
    `stock?workspace_id=eq.${DEFAULT_WORKSPACE}&select=id,product,warehouse,qty_on_hand`
  )
  const map = new Map()
  for (const row of rows) map.set(`${row.product}::${row.warehouse}`, row)
  return map
}

async function upsertStockRow(record) {
  // Relies on the `unique (workspace_id, product, warehouse)` constraint
  // from supabase/add_inventory_tables.sql to do a true upsert. `source`
  // and `updated_at` (supabase/add_stock_source_column.sql) let the
  // Inventory page show this row was last touched by this agent, and
  // when — separate from a person's manual Stock Entry or the in-app
  // Import Excel/CSV button.
  await supabaseFetch('stock?on_conflict=workspace_id,product,warehouse', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      workspace_id: DEFAULT_WORKSPACE,
      ...record,
      source: 'Excel Sync',
      updated_at: new Date().toISOString(),
    }),
  })
}

async function insertMovement(record) {
  await supabaseFetch('stock_movements', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ workspace_id: DEFAULT_WORKSPACE, ...record }),
  })
}

// ── One sync pass ────────────────────────────────────────────────────
async function runOnce() {
  const ts = new Date().toLocaleString('en-IN')

  if (!fs.existsSync(STOCK_FILE_PATH)) {
    console.error(`[${ts}] stock file not found at ${STOCK_FILE_PATH} — check STOCK_FILE_PATH in .env`)
    return
  }

  try {
    const rows = readStockFile(STOCK_FILE_PATH)
    if (rows.length === 0) {
      console.log(`[${ts}] read the file but found no usable rows — check column headers match README`)
      return
    }

    const existing = await fetchExistingStock()
    let updated = 0
    let unchanged = 0

    for (const row of rows) {
      const key = `${row.product}::${row.warehouse}`
      const prior = existing.get(key)
      const priorQty = prior ? Number(prior.qty_on_hand) : null

      if (priorQty !== null && priorQty === row.qty_on_hand) {
        unchanged++
        continue
      }

      await upsertStockRow(row)
      updated++
      console.log(
        `[${ts}] + ${row.product} @ ${row.warehouse}: ${priorQty === null ? '(new)' : priorQty} -> ${row.qty_on_hand} ${row.unit}`
      )

      if (String(LOG_MOVEMENTS).toLowerCase() !== 'false' && priorQty !== null) {
        const diff = row.qty_on_hand - priorQty
        if (diff !== 0) {
          await insertMovement({
            product: row.product,
            warehouse: row.warehouse,
            type: 'Adjustment',
            qty: Math.abs(diff),
            reference: path.basename(STOCK_FILE_PATH),
            notes: `Auto-synced from Excel — ${diff > 0 ? 'increased' : 'decreased'} by ${Math.abs(diff)} ${row.unit}`,
            created_by: 'Excel Sync',
          })
        }
      }
    }

    if (updated === 0) {
      console.log(`[${ts}] checked ${rows.length} row(s), nothing changed`)
    } else {
      console.log(`[${ts}] synced ${updated} change(s), ${unchanged} unchanged`)
    }
  } catch (err) {
    console.error(`[${ts}] sync error:`, err.message)
  }
}

// ── Entry point ──────────────────────────────────────────────────────
console.log(`JSV CRM Excel stock sync agent starting`)
console.log(`  Watching:     ${STOCK_FILE_PATH}`)
console.log(`  Supabase:     ${SUPABASE_URL}`)
console.log(`  Poll backup:  every ${POLL_INTERVAL_SECONDS}s`)

runOnce()

if (!RUN_ONCE) {
  // React instantly to saves...
  chokidar
    .watch(STOCK_FILE_PATH, {
      awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 }, // wait for Excel to finish writing before reading
    })
    .on('change', () => runOnce())

  // ...and also re-check on a timer as a safety net, since file-change
  // notifications are known to be unreliable on some Windows shared/
  // network drives (SMB shares don't always fire the OS-level "changed"
  // event chokidar relies on).
  setInterval(runOnce, Number(POLL_INTERVAL_SECONDS) * 1000)
}
