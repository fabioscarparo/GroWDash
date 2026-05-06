/**
 * GoogleHomeLinking.jsx — Google Home account linking page.
 *
 * This page is the OAuth2 landing point during the Google Home account
 * linking flow. Google redirects the user here after they tap "Link" inside
 * the Google Home app. The page is intentionally rendered outside the main
 * application layout (no header, no bottom nav) so it works cleanly inside
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
import { cn } from '@/lib/utils'

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
 * Displayed when the user opens this page without an active GroWDash session.
 * The backend would reject the code request anyway, so we surface a clear
 * authentication prompt in advance.
 *
 * @component
 * @returns {JSX.Element}
 */
function NotAuthenticated() {
    return (
        <div className="min-h-dvh bg-background flex flex-col items-center">
            <Card className="w-full max-w-sm">
                <CardHeader className="pb-8">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-full">
                            <XCircle size={32} className="text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-[24px] font-semibold tracking-tight">Login Required</CardTitle>
                            <CardDescription className="text-[17px] leading-relaxed">
                                Please sign in to GroWDash first, then retry linking from the Google Home app.
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
 * GoogleHomeLinking — OAuth2 account-linking page for Google Home.
 *
 * Reads OAuth query parameters injected by Google and, on confirmation,
 * requests a short-lived authorization code from the backend before
 * redirecting back to Google's callback URL.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function GoogleHomeLinking() {
    const { isAuthenticated, user } = useAuth()

    /**
     * Linking state machine:
     *   idle     -> initial state
     *   linking  -> code request in flight
     *   success  -> code received, redirecting to Google
     *   error    -> backend call failed, retry allowed
     */
    const [status, setStatus] = useState('idle')

    // OAuth parameters injected by Google into the query string.
    // redirect_uri must be echoed with the generated code.
    // state is an anti-CSRF value that must be returned unchanged.
    const params = new URLSearchParams(window.location.search)
    const redirectUri = params.get('redirect_uri')
    const state = params.get('state')

    // Guard: both parameters are required for the flow to work.
    const paramsValid = Boolean(redirectUri && state)

    /**
     * Requests a short-lived OAuth code from the backend and redirects to the
     * Google callback URL with { code, state } attached.
     *
     * @async
     * @function handleAuthorize
     * @returns {Promise<void>}
     */
    async function handleAuthorize() {
        if (!paramsValid) return
        setStatus('linking')

        try {
            const res = await fetch(`${BASE_URL}/auth/google-home/code`, {
                method: 'POST',
                credentials: 'include',
            })

            if (!res.ok) throw new Error(`Backend returned ${res.status}`)
            const { code } = await res.json()
            setStatus('success')

            // Delay just enough for the success message to be visible.
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
    if (!isAuthenticated) return <NotAuthenticated />

    return (
        <div className="min-h-dvh bg-background flex flex-col items-center">
            
            {/* Cinematic Header */}
            <header className="w-full bg-white dark:bg-[#1d1d1f] pt-8 pb-5 md:pt-10 md:pb-6 px-4 md:px-6 flex justify-center border-b border-border/10">
                <div className="max-w-[480px] w-full">
                    <div className="w-10 h-10 bg-primary/10 rounded-[12px] flex items-center justify-center mb-4">
                        <Home size={22} className="text-primary" />
                    </div>
                    <h1 className="text-[24px] md:text-[30px] font-semibold tracking-tight text-near-black dark:text-white leading-tight mb-1.5">
                        Link with Google
                    </h1>
                    <p className="text-[14px] md:text-[16px] text-muted-foreground/80 font-medium tracking-tight">
                        Authorize GroWDash to share your energy metrics.
                    </p>
                </div>
            </header>

            <main className="max-w-[480px] w-full px-4 md:px-6 py-6 md:py-8 flex flex-col gap-8">
                
                <section className="space-y-4">
                    <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-[0.1em] px-1">
                        Active Account
                    </h2>
                    <Card className="py-0">
                        <CardContent className="py-6 flex items-center gap-4">
                            <div className="p-3 bg-muted/40 rounded-full">
                                <ShieldCheck size={20} className="text-primary/70" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[16px] font-semibold text-near-black dark:text-white">
                                    {user?.username || 'Solar Owner'}
                                </p>
                                <p className="text-[13px] text-muted-foreground">Linked with GroWDash Cloud</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-4">
                    <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-[0.1em] px-1">
                        What Google will see
                    </h2>
                    <Card className="py-0">
                        <CardContent className="py-2">
                            {SHARED_CAPABILITIES.map(({ icon, label }, i) => (
                                <div key={label} className={cn(
                                    "flex items-center gap-3 py-4",
                                    i !== SHARED_CAPABILITIES.length - 1 && "border-b border-border/10"
                                )}>
                                    <span className="text-xl leading-none w-6 text-center">{icon}</span>
                                    <span className="text-[15px] font-medium text-near-black dark:text-white">{label}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <p className="text-[12px] text-muted-foreground leading-relaxed px-1">
                        Linking is <span className="font-semibold text-foreground">read-only</span>. Google Home cannot change your system settings or control hardware.
                    </p>
                </section>

                <div className="flex flex-col gap-4 pt-4">
                    {!paramsValid && (
                        <div className="rounded-[12px] bg-red-500/10 p-4 border border-red-500/20 mb-2">
                            <p className="text-[13px] font-medium text-red-500 text-center">
                                Missing OAuth parameters. Please initiate linking from the Google Home app.
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex items-center justify-center gap-2 text-green-500 text-[14px] font-semibold mb-4 animate-in fade-in zoom-in duration-300">
                            <CheckCircle size={18} />
                            Success! Redirecting back to Google…
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-3 mb-4">
                            <div className="flex items-center gap-2 text-red-500 text-[14px] font-semibold">
                                <XCircle size={18} />
                                Authorization failed. Please try again.
                            </div>
                            <button 
                                onClick={() => setStatus('idle')}
                                className="text-[13px] font-bold text-primary hover:underline"
                            >
                                Tap to retry
                            </button>
                        </div>
                    )}

                    <Button
                        onClick={handleAuthorize}
                        disabled={!paramsValid || status === 'linking' || status === 'success'}
                        variant="pill"
                        className="h-14 text-[17px] font-semibold shadow-2xl"
                    >
                        {status === 'linking' && <Loader2 size={20} className="animate-spin mr-3" />}
                        {status === 'linking' ? 'Authorizing…' :
                         status === 'success' ? 'Wait a moment…' :
                         'Authorize & Link'}
                    </Button>

                    <p className="text-[12px] text-center text-muted-foreground px-6">
                        By linking, you agree to share the data listed above with Google services.
                    </p>
                </div>
            </main>
        </div>
    )
}
