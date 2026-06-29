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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
