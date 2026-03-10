/**
 * AuthContext — Centralized authentication state management.
 *
 * Provides the JWT token, login, and logout functionality to the entire app.
 * The token is persisted in localStorage so sessions survive page refreshes.
 */

import { createContext, useContext, useState, useCallback } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('growdash_token'))
  const [error, setError]  = useState(null)
  const [loading, setLoading] = useState(false)

  /**
   * Sends credentials to the backend and stores the returned JWT token.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<boolean>} true on success, false on failure
   */
  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      // OAuth2PasswordRequestForm expects form-encoded data, not JSON
      const body = new URLSearchParams({ username, password })
      const res = await fetch(`${BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Invalid username or password.')
        return false
      }

      const data = await res.json()
      localStorage.setItem('growdash_token', data.access_token)
      setToken(data.access_token)
      return true
    } catch (e) {
      setError('Could not connect to the server. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Clears the authentication state and removes the token from storage.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('growdash_token')
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, login, logout, error, loading, isAuthenticated: !!token }}>
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
