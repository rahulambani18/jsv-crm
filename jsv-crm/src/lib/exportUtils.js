// src/lib/exportUtils.js
// Shared export helpers — Excel, CSV, PDF, Print — used by every table page.

// ── CSV ──────────────────────────────────────────────────────────────
export function exportCSV(filename, headers, rows) {
  const lines = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${filename}.csv`)
}

// ── Excel (simple TSV that Excel opens correctly) ─────────────────────
export function exportExcel(filename, headers, rows) {
  const lines = [headers, ...rows].map((r) => r.join('\t'))
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  triggerDownload(blob, `${filename}.xls`)
}

// ── PDF (print-to-PDF via browser print dialog) ───────────────────────
export function exportPDF(title, headers, rows) {
  const html = `
  <html>
  <head>
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; }
      h2 { font-size: 16px; margin-bottom: 16px; color: #0f1e3d; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #0f1e3d; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; letter-spacing: 0.04em; }
      td { padding: 8px 10px; border-bottom: 1px solid #e5e2d9; font-size: 12px; }
      tr:nth-child(even) td { background: #fafaf8; }
      .footer { margin-top: 20px; font-size: 10px; color: #9ca3af; }
    </style>
  </head>
  <body>
    <h2>JSV CRM — ${title}</h2>
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <p class="footer">Exported on ${new Date().toLocaleString('en-IN')} · JSV Ingredient CRM</p>
  </body>
  </html>`
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 500)
}

// ── Print (same page, simpler) ────────────────────────────────────────
export function printTable(title, headers, rows) {
  exportPDF(title, headers, rows)
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
