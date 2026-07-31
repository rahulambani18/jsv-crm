import { useEffect, useRef } from 'react'

// Silently re-runs a data-loading callback on an interval (default: every
// 60s) so lists stay current without a manual reload. Pauses while the
// browser tab isn't visible so it doesn't burn requests in the background,
// and always calls the latest version of the callback without needing it
// to be memoized by the caller.
//
// `paused` lets a page offer its own manual pause toggle (e.g. Inventory,
// where people spend longer inside modals and don't want the list jumping
// underneath them) — pass a boolean and the interval is torn down for as
// long as it stays true.
export function useAutoRefresh(callback, intervalMs = 60000, paused = false) {
  const savedCallback = useRef(callback)
  useEffect(() => { savedCallback.current = callback }, [callback])

  useEffect(() => {
    if (!intervalMs || paused) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') savedCallback.current()
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, paused])
}
