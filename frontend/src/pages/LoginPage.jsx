/**
 * LoginPage.jsx — Authentication screen for GroWDash.
 *
 * Presents the credential form and delegates authentication to AuthContext.
 * Persists the last used username locally and supports post-login redirection
 * when the page is opened from protected OAuth linking flows.
 *
 * @module pages/LoginPage
 *
 * Design Rationale:
 * -----------------
 * The login page is intentionally minimal and uses the same theme tokens as the
 * rest of the app so it respects light, dark, and system preferences. It ignores
 * the standard application layout (header/bottom-nav) to maximize focus on
 * security and minimize distraction during the critical authentication phase.
 */

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart } from 'lucide-react'

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Authentication page layout.
 *
 * @component
 * @param {Object} props
 * @param {string|null} [props.returnUrl] - Optional URL to redirect after success.
 * @returns {JSX.Element}
 */
export default function LoginPage({ returnUrl = null }) {
  const { login, error, loading } = useAuth()
  const [username, setUsername] = useState(() => localStorage.getItem('last_username') || '')
  const [password, setPassword] = useState('')

  /**
   * Tracks and stores the last username to reduce repetitive typing.
   *
   * @function handleUsernameChange
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleUsernameChange = (e) => {
    const value = e.target.value
    setUsername(value)
    localStorage.setItem('last_username', value)
  }

  /**
   * Submits credentials through AuthContext and handles redirect/failure paths.
   *
   * @async
   * @function handleSubmit
   * @param {React.FormEvent<HTMLFormElement>} e
   * @returns {Promise<void>}
   */
  async function handleSubmit(e) {
    e.preventDefault()
    const success = await login(username, password)
    if (success && returnUrl) {
      // Redirect back to Google Home linking flow (preserving OAuth params).
      window.location.replace(returnUrl)
    } else if (!success) {
      // Login failed: clear password but keep username.
      setPassword('')
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Glow (Removed as per user request) */}


      <div className="w-full max-w-[400px] z-10 flex flex-col gap-10">

        {/* Logo / Brand */}
        <div className="flex flex-col items-center text-center">
          <img 
            src="/favicon.svg" 
            alt="GroWDash Logo" 
            className="w-20 h-20 rounded-[22%] mb-4" 
          />
          <h1 className="text-[40px] md:text-[48px] font-semibold tracking-[-0.02em] leading-tight text-foreground mb-2">
            GroWDash
          </h1>
          <p className="text-[17px] font-medium text-muted-foreground tracking-tight">
            Elevating your solar experience.
          </p>
        </div>

        {/* Form Card */}
        <Card className="border border-border/70 shadow-[0_24px_48px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.45)] bg-card/90 backdrop-blur-xl rounded-[24px]">
          <CardHeader className="pt-8 pb-4 px-8">
            <CardTitle className="text-[21px] font-semibold text-foreground">Sign In</CardTitle>
            <CardDescription className="text-[14px] text-muted-foreground">Enter your credentials to access your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Username input */}
              <div className="flex flex-col gap-2">
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={loading}
                  placeholder="Username"
                  className="h-12 rounded-[12px] bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/35 focus-visible:border-primary/50"
                />
              </div>

              {/* Password input */}
              <div className="flex flex-col gap-2">
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Password"
                  className="h-12 rounded-[12px] bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/35 focus-visible:border-primary/50"
                />
              </div>

              {/* Authentication error */}
              {error && (
                <div className="rounded-[12px] bg-red-500/10 p-4 border border-red-500/20">
                  <p className="text-[13px] font-medium text-red-400">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={loading || !username || !password}
                variant="pill"
                className="w-full h-12 text-[15px] font-semibold mt-2"
              >
                {loading ? 'Authenticating…' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[13px] text-muted-foreground flex items-center justify-center gap-1.5 font-medium tracking-tight">
          <span>Made with</span>
          <Heart size={12} fill="currentColor" className="text-current" aria-hidden="true" />
          <span>by</span>
          <a
            href="https://www.linkedin.com/in/fabio-scarparo-543b27193/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-foreground no-underline hover:text-primary transition-colors"
          >
            Fabio
          </a>
        </p>
      </footer>
    </div>
  )
}
