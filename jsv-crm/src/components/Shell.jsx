import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import {
  IconGrid, IconUsers, IconClock, IconUserCheck, IconFlask,
  IconFile, IconCart, IconBox, IconChart, IconLogout, IconPanel, IconShield,
  IconCheckSquare, IconCalendar, IconFolder, IconReceipt, IconCreditCard,
} from './Icons.jsx'
import { api } from '../lib/api.js'
import jsvMark from '../assets/jsv-mark.png'
import '../styles/shell.css'

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconGrid, key: 'dashboard' },
  { to: '/leads', label: 'Leads', icon: IconUsers, key: 'leads' },
  { to: '/follow-ups', label: 'Follow-ups', icon: IconClock, key: 'follow_ups' },
  { to: '/customers', label: 'Customers', icon: IconUserCheck, key: 'customers' },
  { to: '/samples', label: 'Samples', icon: IconFlask, key: 'samples' },
  { to: '/quotations', label: 'Quotations', icon: IconFile, key: 'quotations' },
  { to: '/orders', label: 'Orders', icon: IconCart, key: 'orders' },
  { to: '/products', label: 'Products', icon: IconBox, key: 'products' },
  { to: '/reports', label: 'Reports', icon: IconChart, key: 'reports' },
  { to: '/tasks', label: 'Tasks', icon: IconCheckSquare, key: 'tasks' },
  { to: '/meetings', label: 'Meetings', icon: IconCalendar, key: 'meetings' },
  { to: '/documents', label: 'Documents', icon: IconFolder, key: 'documents' },
  { to: '/invoices', label: 'Invoices', icon: IconReceipt, key: 'invoices' },
  { to: '/payments', label: 'Payments', icon: IconCreditCard, key: 'payments' },
]

const ADMIN_NAV = [
  { to: '/users', label: 'Users & Roles', icon: IconShield, key: 'users' },
]

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/follow-ups': 'Follow-ups',
  '/customers': 'Customers',
  '/samples': 'Samples',
  '/quotations': 'Quotations',
  '/orders': 'Orders',
  '/products': 'Products',
  '/reports': 'Reports',
  '/users': 'Users & Roles',
}

export default function Shell({ children }) {
  const { user, signOut, can } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  // Dark mode — persists across sessions
  const [dark, setDark] = useState(() => localStorage.getItem('jsv_theme') === 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('jsv_theme', dark ? 'dark' : 'light')
  }, [dark])
  const title = PAGE_TITLES[location.pathname] || 'JSV CRM'

  // Live clock + time-of-day greeting for the top bar
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (user?.name || '').split(' ')[0]

  const visibleNav = NAV.filter((item) => can(item.key, 'view'))
  const visibleAdminNav = ADMIN_NAV.filter((item) => can(item.key, 'view'))

  // Notification Center + Reminder Engine — recalculated live on every
  // navigation from current data (no server-side cron in this app, so
  // this is a real-time "what needs attention right now" feed rather
  // than a background push notification).
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  const NOTIF_GROUPS = [
    "Today's Follow-ups",
    'Meetings Today',
    'Pending Tasks',
    'Pending Payments',
    'Overdue Quotations',
    'Overdue Follow-ups',
    'Reminder: Sample Follow-up',
    'Reminder: Payment Due',
    'Reminder: Quote Expiry',
    'Reminder: Upcoming Meeting',
  ]
  const GROUP_ICON = {
    "Today's Follow-ups": '📞',
    'Meetings Today': '📅',
    'Pending Tasks': '✅',
    'Pending Payments': '💰',
    'Overdue Quotations': '📄',
    'Overdue Follow-ups': '⏰',
    'Reminder: Sample Follow-up': '🧪',
    'Reminder: Payment Due': '💸',
    'Reminder: Quote Expiry': '⏳',
    'Reminder: Upcoming Meeting': '🗓️',
  }

  useEffect(() => {
    Promise.all([
      api.orders.list(), api.followUps.list(), api.meetings.list(),
      api.tasks.list(), api.quotations.list(), api.samples.list(),
    ]).then(([orders, followUps, meetings, tasks, quotations, samples]) => {
      const today = new Date().toISOString().slice(0, 10)
      const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
      const notifs = []

      // 1) Today's Follow-ups
      followUps.filter((f) => f.status === 'Today').forEach((f) => {
        notifs.push({ id: `fu-today-${f.id}`, group: "Today's Follow-ups", text: `${f.lead || 'Follow-up'} — ${f.type || ''}`, sub: f.notes || f.date, color: 'var(--amber-600)' })
      })

      // Overdue follow-ups (kept from before)
      followUps.filter((f) => f.status === 'Overdue').forEach((f) => {
        notifs.push({ id: `fu-overdue-${f.id}`, group: 'Overdue Follow-ups', text: `Overdue follow-up: ${f.lead}`, sub: `${f.date} · ${f.type}`, color: 'var(--red-600)' })
      })

      // 2) Meetings today
      meetings.filter((m) => m.status === 'Scheduled' && m.date === today).forEach((m) => {
        notifs.push({ id: `mt-${m.id}`, group: 'Meetings Today', text: m.title || m.company, sub: `${m.time || ''} · ${m.location || ''}`, color: 'var(--navy-700)' })
      })

      // Reminder: meeting tomorrow
      meetings.filter((m) => m.status === 'Scheduled' && m.date && daysBetween(today, m.date) === 1).forEach((m) => {
        notifs.push({ id: `mt-tmrw-${m.id}`, group: 'Reminder: Upcoming Meeting', text: m.title || m.company, sub: `Tomorrow · ${m.time || ''}`, color: 'var(--navy-700)' })
      })

      // 3) Pending tasks (due today or overdue, not completed)
      tasks.filter((t) => t.status !== 'Completed' && t.dueDate && t.dueDate <= today).forEach((t) => {
        notifs.push({ id: `tk-${t.id}`, group: 'Pending Tasks', text: t.title, sub: `${t.dueDate < today ? 'Overdue since' : 'Due'} ${t.dueDate}${t.assignedTo ? ' · ' + t.assignedTo : ''}`, color: t.dueDate < today ? 'var(--red-600)' : 'var(--amber-600)' })
      })

      // 4) Pending payments
      orders.filter((o) => o.payment === 'Pending' || o.payment === 'Partial').forEach((o) => {
        notifs.push({ id: `pay-${o.id}`, group: 'Pending Payments', text: `Payment pending: ${o.company}`, sub: `${o.orderNo} · ₹${Number(o.total).toLocaleString('en-IN')}`, color: 'var(--amber-600)' })
        // Reminder: flag it again more urgently once it's been sitting a while
        if (o.orderDate && daysBetween(o.orderDate, today) >= 15) {
          notifs.push({ id: `pay-rem-${o.id}`, group: 'Reminder: Payment Due', text: `${o.company} — ${daysBetween(o.orderDate, today)} days unpaid`, sub: `${o.orderNo} · ₹${Number(o.total).toLocaleString('en-IN')}`, color: 'var(--red-600)' })
        }
      })

      // 5) Overdue quotations (already expired, still open)
      quotations.filter((q) => q.validUntil && q.validUntil < today && !['Accepted', 'Rejected'].includes(q.status)).forEach((q) => {
        notifs.push({ id: `qt-overdue-${q.id}`, group: 'Overdue Quotations', text: `${q.company} — ${q.quoteNo}`, sub: `Expired ${q.validUntil}`, color: 'var(--red-600)' })
      })

      // Reminder: quote expiring within the next 3 days (not yet expired)
      quotations.filter((q) => q.validUntil && q.validUntil >= today && !['Accepted', 'Rejected'].includes(q.status) && daysBetween(today, q.validUntil) <= 3).forEach((q) => {
        const d = daysBetween(today, q.validUntil)
        notifs.push({ id: `qt-exp-${q.id}`, group: 'Reminder: Quote Expiry', text: `${q.company} — ${q.quoteNo}`, sub: d === 0 ? 'Expires today' : `Expires in ${d} day${d === 1 ? '' : 's'}`, color: 'var(--amber-600)' })
      })

      // Reminder: sample sent 5+ days ago, still not delivered
      samples.filter((s) => s.status && s.status !== 'Delivered' && s.sent).forEach((s) => {
        const d = daysBetween(s.sent, today)
        if (d >= 5) {
          notifs.push({ id: `smp-${s.id}`, group: 'Reminder: Sample Follow-up', text: `${s.company}`, sub: `Sent ${d} days ago · still "${s.status}"`, color: 'var(--red-600)' })
        }
      })

      setNotifications(notifs)
    }).catch(() => {})
  }, [location.pathname])

  useEffect(() => {
    function handleClick(e) { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src={jsvMark} alt="JSV" style={{ height: 30, width: 'auto', flexShrink: 0 }} />
          <div className="brand-text">
            <h1>JSV CRM</h1>
            <p>Food Additives &amp; Chemicals</p>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Workspace</div>
        </div>
        <nav className="sidebar-nav">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}

          {visibleAdminNav.length > 0 && (
            <>
              <div className="sidebar-label" style={{ marginTop: 14 }}>Administration</div>
              {visibleAdminNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  <Icon />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className="iso-pill"><span className="dot" /> ISO 9001:2015 Certified</span>
          <div className="user-row">
            <span className="name">{user?.name || 'User'} {user?.role ? `(${user.role})` : ''}</span>
            <span className="role">{user?.role || user?.title || 'Sales Executive'}</span>
          </div>
          <button className="signout-btn" onClick={signOut}>
            <IconLogout /> Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle navigation">
              <IconPanel width={16} height={16} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>
                {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                {'  ·  '}
                {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Dark mode toggle */}
              <button
                onClick={() => setDark((v) => !v)}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{ background: 'transparent', border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: 'pointer', fontSize: 15, color: 'var(--ink-500)' }}
              >
                {dark ? '☀️' : '🌙'}
              </button>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifs((v) => !v)}
                style={{ position: 'relative', background: 'transparent', border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: notifications.length > 0 ? 'var(--amber-600)' : 'var(--ink-500)' }}
                title="Notifications"
              >
                🔔
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--red-600)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: '100px', padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div style={{ position: 'absolute', top: 38, right: 0, width: 340, background: '#fff', border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--paper-100)', fontWeight: 700, fontSize: 13 }}>
                    Notifications {notifications.length > 0 && <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}>({notifications.length})</span>}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px 16px', color: 'var(--ink-400)', fontSize: 13, textAlign: 'center' }}>All caught up! No pending items.</div>
                  ) : (
                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                      {NOTIF_GROUPS.filter((g) => notifications.some((n) => n.group === g)).map((g) => (
                        <div key={g}>
                          <div style={{ padding: '7px 16px 5px', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: 0.4, background: 'var(--paper-50)' }}>
                            {g} <span style={{ fontWeight: 400 }}>({notifications.filter((n) => n.group === g).length})</span>
                          </div>
                          {notifications.filter((n) => n.group === g).map((n) => (
                            <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--paper-100)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              <span style={{ fontSize: 16, marginTop: 1 }}>{GROUP_ICON[n.group] || '🔔'}</span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{n.text}</div>
                                <div style={{ fontSize: 11.5, color: n.color, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{n.sub}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="iso-pill"><span className="dot" /> ISO 9001:2015 Certified</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
