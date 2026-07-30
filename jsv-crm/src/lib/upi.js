// src/lib/upi.js
// Builds a standard UPI deep link (the same upi://pay format used by
// GPay/PhonePe/Paytm/BHIM etc.) — this is a real, working payment
// link as long as a valid UPI ID (VPA) is supplied. No payment
// gateway account or API key is needed for this part; it's just the
// UPI spec's URI scheme. Tapping/scanning it opens the customer's UPI
// app with the amount and note pre-filled — they still have to
// approve the payment themselves.

export function isLikelyVpa(vpa) {
  return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(String(vpa || '').trim())
}

export function buildUpiLink({ vpa, payeeName, amount, note }) {
  if (!isLikelyVpa(vpa)) return null
  const params = new URLSearchParams({
    pa: vpa.trim(),
    pn: payeeName || 'JSV Ingredient',
    am: Number(amount || 0).toFixed(2),
    cu: 'INR',
  })
  if (note) params.set('tn', note.slice(0, 50))
  return `upi://pay?${params.toString()}`
}
