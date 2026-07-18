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
    return action === 'edit' ? !!perm.edit : !!perm.view
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
