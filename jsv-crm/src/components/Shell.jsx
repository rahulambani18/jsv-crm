import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import {
  IconGrid, IconUsers, IconClock, IconUserCheck, IconFlask,
  IconFile, IconCart, IconBox, IconChart, IconLogout, IconPanel, IconShield,
  IconCheckSquare, IconCalendar, IconFolder,
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
  const title = PAGE_TITLES[location.pathname] || 'JSV CRM'

  const visibleNav = NAV.filter((item) => can(item.key, 'view'))
  const visibleAdminNav = ADMIN_NAV.filter((item) => can(item.key, 'view'))

  // Notifications: pending payments + overdue follow-ups
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    Promise.all([api.orders.list(), api.followUps.list()]).then(([orders, followUps]) => {
      const notifs = []
      orders.filter((o) => o.payment === 'Pending' || o.payment === 'Partial').forEach((o) => {
        notifs.push({ id: `pay-${o.id}`, type: 'payment', text: `Payment pending: ${o.company}`, sub: `${o.orderNo} · ₹${Number(o.total).toLocaleString('en-IN')}`, color: 'var(--amber-500)' })
      })
      followUps.filter((f) => f.status === 'Overdue').forEach((f) => {
        notifs.push({ id: `fu-${f.id}`, type: 'followup', text: `Overdue follow-up: ${f.lead}`, sub: `${f.date} · ${f.type}`, color: 'var(--red-600)' })
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
            <span className="role">{user?.title || user?.role || ''}</span>
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
            JSV CRM
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notification bell */}
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
                <div style={{ position: 'absolute', top: 38, right: 0, width: 320, background: '#fff', border: '1px solid var(--paper-200)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--paper-100)', fontWeight: 700, fontSize: 13 }}>
                    Notifications {notifications.length > 0 && <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}>({notifications.length})</span>}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px 16px', color: 'var(--ink-400)', fontSize: 13, textAlign: 'center' }}>All caught up! No pending items.</div>
                  ) : (
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {notifications.map((n) => (
                        <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--paper-100)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 16, marginTop: 1 }}>{n.type === 'payment' ? '💰' : '⏰'}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{n.text}</div>
                            <div style={{ fontSize: 11.5, color: n.color, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{n.sub}</div>
                          </div>
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
