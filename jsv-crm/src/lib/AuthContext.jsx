import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.getUser().then((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  // Permissions are only fetched at login/page-load and then kept in
  // memory for the session — so if an admin changes someone's access
  // while their tab stays open, they'd otherwise keep seeing modules
  // they've since been locked out of (or vice versa) until they happen
  // to reload. Quietly re-fetch whenever the tab regains focus/becomes
  // visible again, plus every few minutes as a safety net, so access
  // changes take effect without anyone needing to log out and back in.
  useEffect(() => {
    function refreshUser() {
      if (document.visibilityState !== 'visible') return
      auth.getUser().then((u) => { if (u) setUser(u) }).catch(() => {})
    }
    window.addEventListener('focus', refreshUser)
    document.addEventListener('visibilitychange', refreshUser)
    const interval = setInterval(refreshUser, 5 * 60 * 1000)
    return () => {
      window.removeEventListener('focus', refreshUser)
      document.removeEventListener('visibilitychange', refreshUser)
      clearInterval(interval)
    }
  }, [])

  async function signIn(email, password) {
    const u = await auth.signIn(email, password)
    setUser(u)
    return u
  }

  async function signOut() {
    await auth.signOut()
    setUser(null)
  }

  // Admins implicitly get full access even if permissions weren't
  // loaded yet (e.g. brand-new workspace with no role_permissions rows).
  function can(moduleKey, action = 'view') {
    if (!user) return false
    if (user.role === 'Admin') return true
    const perm = user.permissions?.[moduleKey]
    if (!perm) return false
    if (action === 'delete') return !!perm.delete
    if (action === 'edit') return !!perm.edit
    return !!perm.view
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
