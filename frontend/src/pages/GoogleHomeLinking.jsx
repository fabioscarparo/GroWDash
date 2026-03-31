/**
 * GoogleHomeLinking.jsx — Google Home account linking page.
 *
 * This page is the OAuth2 landing point during the Google Home account
 * linking flow. Google redirects the user here after they tap "Link" inside
 * the Google Home app. The page is intentionally rendered outside the main
 * application layout (no sidebar, no bottom nav) so it works cleanly inside
 * the in-app browser that Google Home spawns.
 *
 * Flow:
 *   1. Google redirects to /google-home-link?redirect_uri=...&state=...
 *   2. App.jsx detects the pathname and renders this component directly,
 *      bypassing the normal authenticated layout.
 *   3. If the user is not yet logged in to GroWDash, a prompt is shown.
 *   4. When the user taps "Authorize", a short-lived OAuth code is requested
 *      from POST /auth/google-home/code (requires the session cookie).
 *   5. The code is appended to Google's redirect_uri together with the state
 *      parameter, and the browser is redirected back to Google.
 *   6. Google exchanges the code for an access token via POST /google-home/token.
 *
 * Security notes:
 *   - The OAuth code is a JWT signed with HS256 that expires in 5 minutes and
 *     carries a "purpose: google-home-oauth" claim so it cannot be reused as a
 *     regular session token.
 *   - The backend validates the redirect_uri against a hard-coded whitelist of
 *     Google's OAuth redirect domains before issuing the code.
 *   - Access tokens issued to Google carry "aud: google-home" and are therefore
 *     rejected by every other GroWDash endpoint.
 *
 * @module pages/GoogleHomeLinking
 */

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card'
import { Home, CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Sensor capabilities that will be shared with Google Home in read-only mode.
 * Displayed as a plain list to inform the user before they authorize.
 */
const SHARED_CAPABILITIES = [
    { icon: '☀️', label: 'Solar production (W)' },
    { icon: '🏠', label: 'Home consumption (W)' },
    { icon: '🔋', label: 'Battery state of charge (%)' },
    { icon: '⬇️', label: 'Grid import power (W)' },
    { icon: '⬆️', label: 'Grid export power (W)' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Displayed when the user navigates to this page without an active GroWDash
 * session. The backend would reject the code request anyway, but we surface
 * a clear message rather than letting the fetch silently fail.
 */
function NotAuthenticated() {
    return (
        <div className="min-h-dvh bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-destructive/10 rounded-lg">
                            <Home size={22} className="text-destructive" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Login required</CardTitle>
                            <CardDescription className="text-xs">
                                Sign in to GroWDash first, then retry linking from the Google
                                Home app.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * GoogleHomeLinking — OAuth2 account linking page for Google Home.
 *
 * Reads the OAuth2 parameters injected by Google via the query string and,
 * upon user confirmation, fetches a short-lived authorization code from the
 * GroWDash backend and redirects back to Google to complete the handshake.
 *
 * @returns {JSX.Element}
 */
export default function GoogleHomeLinking() {
    const { isAuthenticated, user } = useAuth()

    /**
     * Linking state machine:
     *   idle     → initial state, button is enabled
     *   linking  → fetch in progress, button shows spinner
     *   success  → code obtained, redirecting to Google
     *   error    → fetch failed, user can retry
     */
    const [status, setStatus] = useState('idle')

    // OAuth2 parameters injected by Google into the query string.
    // redirect_uri is the Google-owned URL we must send the code back to.
    // state is an opaque value Google uses to prevent CSRF; we must echo it.
    const params = new URLSearchParams(window.location.search)
    const redirectUri = params.get('redirect_uri')
    const state = params.get('state')

    // Guard: both parameters must be present for the flow to work.
    const paramsValid = Boolean(redirectUri && state)

    /**
     * Requests a short-lived OAuth code from the backend and redirects the
     * browser back to Google's redirect_uri with the code and state attached.
     *
     * The backend endpoint requires an active GroWDash session cookie and
     * returns a signed JWT with a 5-minute TTL and a purpose claim that
     * prevents the code from being used as a regular session token.
     */
    async function handleAuthorize() {
        if (!paramsValid) return
        setStatus('linking')

        try {
            const res = await fetch(`${BASE_URL}/auth/google-home/code`, {
                method: 'POST',
                credentials: 'include',   // sends the GroWDash HttpOnly session cookie
            })

            if (!res.ok) throw new Error(`Backend returned ${res.status}`)

            const { code } = await res.json()

            setStatus('success')

            // Build the Google callback URL and redirect after a short delay so
            // the success message is visible to the user for a moment.
            setTimeout(() => {
                const callbackUrl = new URL(redirectUri)
                callbackUrl.searchParams.set('code', code)
                callbackUrl.searchParams.set('state', state)
                window.location.href = callbackUrl.toString()
            }, 1200)

        } catch {
            setStatus('error')
        }
    }

    // ── Early return: unauthenticated ─────────────────────────────────────────

    if (!isAuthenticated) {
        return <NotAuthenticated />
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-dvh bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">

                {/* Header */}
                <CardHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Home size={22} className="text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Link Google Home</CardTitle>
                            <CardDescription className="text-xs">
                                Signed in as <span className="font-medium text-foreground">{user?.username}</span>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-5">

                    {/* Read-only disclaimer */}
                    <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 border border-border px-3 py-2.5">
                        <ShieldCheck size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Google Home will have <span className="font-semibold text-foreground">read-only</span> access
                            to your inverter data. No settings can be changed remotely.
                        </p>
                    </div>

                    {/* Capability list */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                            Shared data
                        </p>
                        {SHARED_CAPABILITIES.map(({ icon, label }) => (
                            <div key={label} className="flex items-center gap-2 text-sm text-foreground">
                                <span className="text-base leading-none">{icon}</span>
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Missing parameters warning */}
                    {!paramsValid && (
                        <div className="flex items-center gap-2 text-destructive text-xs">
                            <XCircle size={14} />
                            Missing OAuth parameters. Open this page from the Google Home app.
                        </div>
                    )}

                    {/* Status messages */}
                    {status === 'success' && (
                        <div className="flex items-center gap-2 text-green-500 text-sm">
                            <CheckCircle size={15} />
                            Linked successfully. Redirecting back to Google…
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                            <XCircle size={15} />
                            Something went wrong. Please try again.
                        </div>
                    )}

                    {/* Authorize button */}
                    <Button
                        onClick={handleAuthorize}
                        disabled={!paramsValid || status === 'linking' || status === 'success'}
                        className="w-full"
                    >
                        {status === 'linking' && (
                            <Loader2 size={15} className="animate-spin mr-2" />
                        )}
                        {status === 'linking' ? 'Authorizing…' :
                            status === 'success' ? 'Redirecting…' :
                                'Authorize Google Home'}
                    </Button>

                    {/* Retry hint on error */}
                    {status === 'error' && (
                        <button
                            onClick={() => setStatus('idle')}
                            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors mx-auto"
                        >
                            Try again
                        </button>
                    )}

                </CardContent>
            </Card>
        </div>
    )
}
