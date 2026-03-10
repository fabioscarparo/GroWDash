/**
 * LoginPage — Authentication screen for GroWDash.
 *
 * A clean, minimal login form that submits credentials to the backend
 * via the AuthContext login function. Shows an error if credentials are
 * invalid and a loading state while the request is in flight.
 */

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const { login, error, loading } = useAuth()
  const [username, setUsername] = useState(() => localStorage.getItem('last_username') || '')
  const [password, setPassword] = useState('')

  const handleUsernameChange = (e) => {
    const value = e.target.value
    setUsername(value)
    localStorage.setItem('last_username', value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const success = await login(username, password)
    // If login failed, clear password but keep username
    if (!success) {
      console.log('Login failed, clearing password but keeping username:', username)
      setPassword('')
    }
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img src="/favicon.svg" alt="GroWDash Logo" className="w-12 h-12 mb-3" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">GroWDash</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to access your dashboard</p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Username Input */}
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={loading}
                  placeholder="Enter your username"
                />
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Enter your password"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full mt-2"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
