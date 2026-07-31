import { useCallback, useRef, useState } from 'react'

// Lets a page's stat cards jump down to (and briefly flash) the panel or
// table they summarize, e.g. clicking "60+ Days" scrolls to the aging
// table. Usage:
//   const { sectionRef, scrollTo, flashClass } = useSectionScroll()
//   <div ref={sectionRef('overdue')} className={`panel ${flashClass('overdue')}`}>
//   <StatCard onClick={() => scrollTo('overdue')} />
export function useSectionScroll() {
  const els = useRef({})
  const [flash, setFlash] = useState(null)

  const sectionRef = useCallback((key) => (el) => { els.current[key] = el }, [])

  const scrollTo = useCallback((key) => {
    const el = els.current[key]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setFlash(key)
    setTimeout(() => setFlash((f) => (f === key ? null : f)), 1400)
  }, [])

  const flashClass = useCallback((key) => (flash === key ? 'section-flash' : ''), [flash])

  return { sectionRef, scrollTo, flashClass }
}
