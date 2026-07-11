import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { isMock } from '../lib/api.js'
import jsvMark from '../assets/jsv-mark.png'
import '../styles/components.css'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('rahul@jsvchem.com')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your details and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <img src={jsvMark} alt="JSV Ingredient" style={{ height: 44, width: 'auto' }} />
          <div>
            <h2 style={{ margin: 0 }}>JSV CRM</h2>
            <p className="sub" style={{ margin: 0 }}>Food Additives &amp; Chemicals</p>
          </div>
        </div>
        <p className="sub">Sign in to your sales workspace.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Username or Email</label>
            <input
              id="email"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your username or email"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          {error && <p style={{ color: 'var(--red-600)', fontSize: 13, marginTop: -4, marginBottom: 14 }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center', padding: '10px 0' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {isMock && (
          <p className="login-demo-note">
            Running on demo data — any email and password signs you in. Connect Supabase
            (see <code>supabase/schema.sql</code>) to use real accounts and persistent data.
          </p>
        )}
      </div>
    </div>
  )
}
