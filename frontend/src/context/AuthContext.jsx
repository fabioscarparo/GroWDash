import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../api/growatt'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [error, setError]  = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, check if we have a valid session cookie
  useEffect(() => {
    async function checkSession() {
      try {
        const u = await api.getMe()
        setUser(u)
      } catch (err) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [])

  /**
   * Sends credentials to the backend. The backend sets the HttpOnly cookie.
   */
  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const body = new URLSearchParams({ username, password })
      const res = await fetch(`${BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        credentials: 'include', // Important to receive the cookie
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Invalid username or password.')
        return false
      }

      const u = await api.getMe()
      setUser(u)
      return true
    } catch (e) {
      setError('Could not connect to the server. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Clears the authentication state and removes the cookie on the server.
   */
  const logout = useCallback(async () => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      })
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, error, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access the authentication context.
 * @throws if used outside of AuthProvider
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
