// src/lib/fileImport.js
// Reads a .csv or .xlsx file selected by the user and returns an array
// of plain objects keyed by the header row. Used by Products (and any
// future "Import Excel/CSV" buttons) to bulk-load records.

import * as XLSX from 'xlsx'

export function readSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        resolve(rows)
      } catch (err) {
        reject(new Error('Could not parse this file. Make sure it is a valid .csv or .xlsx file.'))
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

// Normalizes a raw imported row's keys (case/space-insensitive) against
// a list of expected field names, so "Product Name", "product_name", and
// "ProductName" in the source file all map to the same field.
export function normalizeRow(row, fieldMap) {
  const out = {}
  const rowKeysLower = Object.fromEntries(
    Object.keys(row).map((k) => [k.toLowerCase().replace(/[\s_]/g, ''), k])
  )
  for (const [field, aliases] of Object.entries(fieldMap)) {
    const match = aliases.find((alias) => rowKeysLower[alias.toLowerCase().replace(/[\s_]/g, '')])
    if (match) {
      out[field] = row[rowKeysLower[match.toLowerCase().replace(/[\s_]/g, '')]]
    }
  }
  return out
}
