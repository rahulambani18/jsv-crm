import { useEffect, useState } from 'react'
import { subscribeToast } from '../lib/toast.js'

const AUTO_DISMISS_MS = 3500

export default function ToastStack() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, AUTO_DISMISS_MS)
    })
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="toast-message">{t.message}</span>
          <button
            className="toast-dismiss"
            aria-label="Dismiss"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
