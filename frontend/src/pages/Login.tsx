// src/pages/Login.tsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowRight, Mail, Lock, User,
  Plane, Home, PartyPopper, ShieldCheck, Loader2, Link2,
} from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { toast } from 'sonner'

type Mode = 'login' | 'signup'

const GoogleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

const FEATURES = [
  { icon: Plane,       label: 'Trip expenses',      desc: 'Track every spend across currencies' },
  { icon: Home,        label: 'Household splits',   desc: 'Shared bills, zero arguments' },
  { icon: PartyPopper, label: 'Events & occasions', desc: 'One-off costs settled instantly' },
  { icon: User,        label: 'Personal tracking',  desc: 'Log expenses just for yourself' },
]

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useStore()
  const redirectTo = (location.state as any)?.redirectTo
    ?? sessionStorage.getItem('post_login_redirect')
    ?? '/dashboard'

  const [mode, setMode] = useState<Mode>((location.state as any)?.tab === 'signup' ? 'signup' : 'login')

  useEffect(() => {
    if (sessionStorage.getItem('auth_expired')) {
      sessionStorage.removeItem('auth_expired')
      toast.info('Your session expired — please sign in again.')
    }
  }, [])

  useEffect(() => {
    if (!auth.isLoading && auth.isLoggedIn) {
      sessionStorage.removeItem('post_login_redirect')
      navigate(redirectTo, { replace: true })
    }
  }, [auth.isLoading, auth.isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmEmailSent, setConfirmEmailSent] = useState(false)

  const switchMode = (m: Mode) => {
    setMode(m); setError(null); setPassword(''); setConfirmPassword('')
    setShowForgot(false); setForgotSent(false)
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!email.trim())    { setError('Email is required.'); return }
    if (!password)        { setError('Password is required.'); return }
    if (mode === 'signup') {
      if (!displayName.trim())          { setError('Display name is required.'); return }
      if (password.length < 8)          { setError('Password must be at least 8 characters.'); return }
      if (password !== confirmPassword)  { setError("Passwords don't match."); return }
    }
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await auth.loginWithEmail(email, password)
        toast.success('Welcome back!')
        navigate(redirectTo, { replace: true })
      } else {
        const { needsEmailConfirmation } = await auth.signUp(email, password, displayName)
        if (needsEmailConfirmation) {
          // No session yet — navigating would just bounce back to /login
          setConfirmEmailSent(true)
        } else {
          toast.success('Welcome to TripLedger!')
          navigate(redirectTo, { replace: true, state: { welcome: true, name: displayName } })
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    if (redirectTo !== '/dashboard') {
      sessionStorage.setItem('post_login_redirect', redirectTo)
    }
    await auth.loginWithGoogle(redirectTo)
    if (auth.error) toast.error(auth.error)
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(152,45%,82%) 0%, hsl(165,32%,92%) 55%, hsl(160,18%,99%) 100%)' }}>

      {/* Main content */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">

      {/* ── Left panel — branding (desktop only) ──────────────────────── */}
      <div className="hidden sm:flex sm:w-1/2 border-r flex-col justify-between p-10" style={{ background: 'linear-gradient(180deg, hsl(152,50%,78%) 0%, hsl(165,35%,90%) 100%)' }}>
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">TripLedger</h1>
          <p className="text-sm text-muted-foreground">Split expenses, not friendships.</p>
        </div>

        <div className="space-y-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Everything in one place
          </p>
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Multi-currency · Smart settlements · Shared notes
        </p>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-6 overflow-hidden">

        <div className="w-full max-w-sm mx-auto space-y-4 sm:bg-white/80 sm:backdrop-blur-sm sm:rounded-2xl sm:p-6 sm:shadow-sm">

          {/* Heading */}
          <div className="mb-1 mt-8 sm:mt-0 text-center sm:text-left">
            <h2 className="text-2xl font-bold">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {mode === 'login' ? 'Sign in to continue' : 'Get started for free'}
            </p>
          </div>

          {confirmEmailSent ? (
            /* Email-confirmation-required state (Supabase confirmation ON) */
            <div className="rounded-lg border bg-card p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail size={20} className="text-primary" />
              </div>
              <h3 className="text-base font-semibold">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to{' '}
                <span className="font-medium text-foreground">{email}</span>.
                Confirm your address, then come back and log in.
              </p>
              <button
                type="button"
                onClick={() => { setConfirmEmailSent(false); switchMode('login') }}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Back to log in
              </button>
            </div>
          ) : (
          <>
          {/* Mode toggle — desktop only */}
          <div className="hidden sm:flex rounded-lg border bg-muted/30 p-1">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  mode === m ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Google — desktop: full button before form */}
          <button
            type="button"
            onClick={handleGoogle}
            aria-label="Continue with Google"
            className="hidden sm:flex w-full items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border bg-card hover:bg-muted transition-colors text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider — desktop only */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Display name — signup only */}
            {mode === 'signup' && (
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value.slice(0, 50))}
                  maxLength={50}
                  placeholder="Display name"
                  autoComplete="name"
                  className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Password (min. 8 chars)' : 'Password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full border rounded-lg pl-9 pr-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Confirm password — signup only */}
            {mode === 'signup' && (
              <div className="relative">
                <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="w-full border rounded-lg pl-9 pr-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}

            {/* Forgot password */}
            {mode === 'login' && !showForgot && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(email) }}
                  className="text-xs text-primary hover:opacity-70 transition-opacity"
                >
                  Forgot password?
                </button>
              </div>
            )}
            {mode === 'login' && showForgot && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 -mt-1">
                {forgotSent ? (
                  <p className="text-xs text-green-600 font-medium">
                    Reset link sent — check your email.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Enter your email to receive a reset link.</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 border rounded-md px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        disabled={forgotLoading || !forgotEmail.trim()}
                        onClick={async () => {
                          setForgotLoading(true)
                          try {
                            await auth.sendPasswordReset(forgotEmail.trim())
                            setForgotSent(true)
                          } catch (err: any) {
                            setError(err.message ?? 'Failed to send reset email.')
                          } finally {
                            setForgotLoading(false)
                          }
                        }}
                        className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {forgotLoading ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotSent(false) }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting
                ? <><Loader2 size={15} className="animate-spin" />{mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
                : <>{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={15} /></>
              }
            </button>

            {/* Divider — mobile only */}
            <div className="flex sm:hidden items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google icon only — mobile only */}
            <button
              type="button"
              onClick={handleGoogle}
              aria-label="Continue with Google"
              className="sm:hidden w-full flex items-center justify-center py-2.5 hover:opacity-70 transition-opacity"
            >
              <GoogleIcon />
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="font-bold sm:font-medium sm:text-primary hover:opacity-70 transition-opacity"
              style={{ color: 'hsl(161, 93%, 22%)' }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
          </>
          )}

          {/* Invite code entry */}
          <div className="border-t pt-5 mt-2">
            {!showCodeInput ? (
              <button
                type="button"
                onClick={() => setShowCodeInput(true)}
                className="w-full text-sm sm:font-normal sm:text-muted-foreground font-bold flex items-center justify-center gap-2 py-1 hover:opacity-80 transition-opacity"
                style={{ color: 'hsl(161, 93%, 22%)' }}
              >
                <Link2 size={14} />
                Have an invite code? Join a circle
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Enter your invite code</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono tracking-widest bg-background focus:outline-none focus:ring-2 focus:ring-primary text-center uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => { if (inviteCode.trim().length >= 6) navigate(`/join/${inviteCode.trim()}`) }}
                    disabled={inviteCode.trim().length < 6}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
                <button type="button" onClick={() => { setShowCodeInput(false); setInviteCode('') }} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>

      {/* Footer */}
      <div className="py-4 text-center">
        <p className="text-xs text-foreground/50">© 2026 TripLedger. All rights reserved.</p>
      </div>
    </div>
  )
}

export default Login
