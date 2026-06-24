// src/pages/ResetPassword.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)

  // Supabase puts the session tokens in the URL hash after redirect.
  // onAuthStateChange fires with event=PASSWORD_RECOVERY once they're parsed.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!ready) setLinkExpired(true)
    }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeout)
        setLinkExpired(false)
        setReady(true)
      }
    })
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      toast.success('Password updated. You can now log in.')
      navigate('/login', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Failed to update password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, hsl(152,45%,82%) 0%, hsl(165,32%,92%) 55%, hsl(160,18%,99%) 100%)' }}>
      <div className="w-full max-w-sm space-y-6">

        <div>
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ready ? 'Choose a new password for your account.' : 'Verifying reset link…'}
          </p>
        </div>

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password (min. 8 chars)"
                className="w-full border rounded-lg px-3 pr-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="relative">
              <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full border rounded-lg pl-9 pr-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || !password || !confirm}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting
                ? <><Loader2 size={15} className="animate-spin" />Updating…</>
                : 'Update password'
              }
            </button>
          </form>
        )}

        {!ready && !linkExpired && (
          <div className="flex justify-center">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}

        {linkExpired && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-destructive font-medium">This link has expired or is invalid.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Request a new reset link
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default ResetPassword
