import { useCallback, useEffect, useState } from 'react'

// Remembers a filter's last value in localStorage so the page opens the
// way the user left it instead of resetting every time. A value coming
// from the URL (e.g. a deep link from a Dashboard stat card, like
// /orders?payment=Pending) always wins on first load — after that,
// whatever the user picks is what gets remembered for next time.
//
// key      — unique storage key, e.g. 'jsv_filter_orders_status'
// urlValue — the value read from the URL on this load, or undefined/''/null
//            if the URL didn't specify one
// fallback — the value to use if there's nothing in the URL or storage yet
//
// Returns [value, setValue, meta] — meta.clear() resets to fallback and
// meta.isDefault reports whether the current value already is the
// fallback, so callers can show/hide a "Clear filters" control. Existing
// 2-item destructuring (`const [x, setX] = usePersistedFilter(...)`)
// keeps working unchanged.
export function usePersistedFilter(key, urlValue, fallback) {
  const hasUrlValue = urlValue !== undefined && urlValue !== null && urlValue !== ''

  const [value, setValue] = useState(() => {
    if (hasUrlValue) return urlValue
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable — just don't persist */ }
  }, [key, value])

  const clear = useCallback(() => setValue(fallback), [fallback])
  const isDefault = JSON.stringify(value) === JSON.stringify(fallback)

  return [value, setValue, { clear, isDefault }]
}
