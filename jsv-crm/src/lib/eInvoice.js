// src/lib/eInvoice.js
//
// !! DEMO ONLY !!
// Real e-invoicing means submitting the invoice JSON to the GST
// Invoice Registration Portal (IRP) — directly or via a GSP such as
// ClearTax/Cygnet/MasterGST — which validates it and hands back a
// government-signed Invoice Reference Number (IRN), an
// acknowledgement number/date, and a signed QR code. That requires
// API credentials this project doesn't have.
//
// What this file generates instead is a realistic-*looking*
// placeholder (right length/format) so the UI, data model and
// workflow are ready — swap generateMockIRN()'s body for a real IRP
// API call when GSP credentials are available, and everything else
// (the modal, the stored columns, the "IRN" badge on the row) keeps
// working unchanged.

function randomHex(len) {
  let out = ''
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 16).toString(16)
  return out
}

// Real IRNs are a 64-character SHA-256 hex hash. We fake the shape,
// not the cryptography.
export function generateMockIRN() {
  return randomHex(64)
}

export function generateMockAckNo() {
  return String(Math.floor(100000000000 + Math.random() * 899999999999))
}

export function generateEInvoice(inv) {
  return {
    einvoiceIrn: generateMockIRN(),
    einvoiceAckNo: generateMockAckNo(),
    einvoiceAckDate: new Date().toISOString(),
  }
}

// Payload encoded into the signed QR code on a real e-invoice
// (simplified — the real one is a signed JSON string from the IRP).
export function qrPayloadFor(inv, irn) {
  return JSON.stringify({
    SellerGstin: '27AABCJ1234P1ZV',
    InvNo: inv.invoiceNo,
    InvDt: inv.issueDate,
    total: Number(inv.total || 0),
    Irn: irn,
  })
}
