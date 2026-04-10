/**
 * AuthContext.jsx — Authentication lifecycle and session management.
 *
 * Exposes a global Context Provider securely managing the user session 
 * through HttpOnly secure cookies. Interfaces directly with backend `/auth` endpoints 
 * validating, establishing, and terminating authenticated sessions.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../api/growatt'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AuthContext = createContext(null)

/**
 * AuthProvider component wraps the application lifecycle to securely isolate and map 
 * reactive user state downwards via Context API. Tracks internal fetch lifecycles seamlessly 
 * resolving 'Loading', 'Error', and verified 'User' entities.
 *
 * @component
 * @param {object} props - The component parameters.
 * @param {JSX.Element} props.children - Bound nested application tree to be provided with context wrappers.
 * @returns {JSX.Element} Instantiated Context Provider containing user models and credential mutation closures.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, check if we have a valid session cookie
  useEffect(() => {
    async function checkSession() {
      try {
        const u = await api.getMe()
        setUser(u)
      } catch (err) {
        // 401 is expected when session has expired or user is not logged in
        // Silently handle it without logging to console
        if (err.status !== 401) {
          console.error('Session check failed:', err)
        }
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [])

  /**
   * Executes a secure asynchronous credentials check against the main `/auth/token` backend.
   * Expects a secure JWT mapped automatically into the host `HttpOnly` cookie upon successful handshake.
   * Modifies component closure state dynamically logging internal server blockades or verification denials.
   *
   * @function login
   * @async
   * @param {string} username - User inputted identity string.
   * @param {string} password - Raw text user credential input.
   * @returns {Promise<boolean>} Yields strictly true if the handshake succeeds, else false tracking errors internally.
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

      if (res.status === 429) {
        setError('Too many login attempts. Please wait a minute.')
        return false
      }

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
   * Clears the authentication state locally while explicitly instructing the backend API 
   * to revoke and invalidate the active secure access cookie context. 
   * Protects aggressively against token leaks post-session termination.
   *
   * @function logout
   * @async
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
   * Hook exposing robust internal consumption of the AuthContext parameters.
   * Hard-panics if leveraged outside of an explicit AuthProvider lineage enforcing logical strictness.
   *
   * @function useAuth
   * @throws {Error} If implicitly consumed disconnected from the main application root provider layer.
   * @returns {{ user: object|null, login: function, logout: function, error: string|null, loading: boolean, isAuthenticated: boolean }} Context payload object.
   */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
