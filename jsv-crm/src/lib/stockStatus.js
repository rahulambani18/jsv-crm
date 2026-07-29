// src/lib/stockStatus.js
// Single source of truth for stock quantity math, now that a stock
// line's qtyOnHand can be partly reserved (earmarked for a confirmed
// order) or damaged (physically on the shelf but not sellable).
// Inventory and Dashboard both import from here so "available" and
// "low/out of stock" always mean the same thing in both places.

export function availableQty(row) {
  const onHand = Number(row?.qtyOnHand || 0)
  const reserved = Number(row?.reservedQty || 0)
  const damaged = Number(row?.damagedQty || 0)
  return Math.max(0, onHand - reserved - damaged)
}

export function stockStatus(row) {
  const available = availableQty(row)
  if (available <= 0) return 'Out of Stock'
  if (Number(row?.reorderLevel) > 0 && available <= Number(row.reorderLevel)) return 'Low Stock'
  return 'In Stock'
}
