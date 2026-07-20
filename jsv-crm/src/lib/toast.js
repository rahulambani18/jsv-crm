// Lightweight toast system — call showToast() from anywhere (no
// Context/Provider wiring needed in each page). <ToastStack /> is
// mounted once in App.jsx and listens for these events.

const listeners = new Set()

export function showToast(message, type = 'success') {
  const toast = { id: `${Date.now()}-${Math.random()}`, message, type }
  listeners.forEach((fn) => fn(toast))
}

export function subscribeToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
