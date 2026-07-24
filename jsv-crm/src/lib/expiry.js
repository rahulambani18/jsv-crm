// src/lib/expiry.js
// Single source of truth for "is this stock batch expired / expiring
// soon" so the Inventory page and the Dashboard's Expiry Products
// widget always agree on the same definition and reference date.

import { APP_TODAY } from './overdue.js'

// Batches expiring within this many days are flagged "Expiring Soon".
export const EXPIRY_WARNING_DAYS = 60

export function daysToExpiry(expiryDate, today = APP_TODAY) {
  if (!expiryDate) return null
  const ms = new Date(expiryDate).getTime() - new Date(today).getTime()
  return Math.round(ms / 86400000)
}

export function isExpired(row, today = APP_TODAY) {
  if (!row?.expiryDate) return false
  return row.expiryDate < today
}

export function isExpiringSoon(row, today = APP_TODAY) {
  if (!row?.expiryDate || isExpired(row, today)) return false
  const days = daysToExpiry(row.expiryDate, today)
  return days !== null && days <= EXPIRY_WARNING_DAYS
}

export function expiryStatus(row, today = APP_TODAY) {
  if (!row?.expiryDate) return null
  if (isExpired(row, today)) return 'Expired'
  if (isExpiringSoon(row, today)) return 'Expiring Soon'
  return 'OK'
}

// Stock rows that need attention, nearest expiry first — used by both
// the Inventory page's Expiry column and the Dashboard widget.
export function getExpiringStock(stock, today = APP_TODAY) {
  return (stock || [])
    .filter((s) => s.expiryDate && (isExpired(s, today) || isExpiringSoon(s, today)) && Number(s.qtyOnHand) > 0)
    .sort((a, b) => (a.expiryDate < b.expiryDate ? -1 : 1))
}
