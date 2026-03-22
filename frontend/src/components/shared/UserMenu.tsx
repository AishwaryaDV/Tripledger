// src/components/shared/UserMenu.tsx
import { useState, useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, User, Lock, X, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'

const PRONOUN_OPTIONS = [
  '', 'he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'any pronouns', 'prefer not to say',
]

const MEMBER_COLORS = ['#818cf8','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#facc15','#2dd4bf']

// ── Profile Drawer ─────────────────────────────────────────────────────────────
const ProfileDrawer = observer(({ onClose }: { onClose: () => void }) => {
  const { auth } = useStore()
  const user = auth.currentUser!

  // Only accept known pronoun values, discard anything that looks wrong (e.g. stale email)
  const validPronouns = PRONOUN_OPTIONS.includes(user.pronouns ?? '') ? (user.pronouns ?? '') : ''

  const [displayName, setDisplayName] = useState(user.displayName)
  const [pronouns, setPronouns] = useState(validPronouns)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [nameLoading, setNameLoading] = useState(false)
  const [pronounsLoading, setPronounsLoading] = useState(false)
  const [passLoading, setPassLoading] = useState(false)

  const avatarColor = MEMBER_COLORS[user.displayName.charCodeAt(0) % MEMBER_COLORS.length]
  const initial = user.displayName.charAt(0).toUpperCase()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleUpdateName = async () => {
    if (!displayName.trim()) return
    setNameLoading(true)
    try {
      await auth.updateDisplayName(displayName.trim())
      toast.success('Display name updated.')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update name.')
    } finally {
      setNameLoading(false)
    }
  }

  const handleUpdatePronouns = async () => {
    setPronounsLoading(true)
    try {
      await auth.updatePronouns(pronouns)
      toast.success('Pronouns updated.')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update pronouns.')
    } finally {
      setPronounsLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return }
    setPassLoading(true)
    try {
      await auth.updatePassword(newPassword)
      toast.success('Password updated.')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update password.')
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-card border-l shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="text-base font-semibold">My Profile</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.displayName}</p>
              {validPronouns && <p className="text-xs text-muted-foreground mt-0.5">{validPronouns}</p>}
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="border-t" />

          {/* Display name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <User size={13} className="text-muted-foreground" />
              Display name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleUpdateName}
                disabled={nameLoading || !displayName.trim() || displayName === user.displayName}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {nameLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Pronouns dropdown */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1">
              Pronouns
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={pronouns}
                  onChange={e => setPronouns(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-8"
                >
                  <option value="">Select pronouns</option>
                  {PRONOUN_OPTIONS.filter(p => p).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              <button
                onClick={handleUpdatePronouns}
                disabled={pronounsLoading || pronouns === validPronouns}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pronounsLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Email — read only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm px-3 py-2 border rounded-lg bg-muted/30 text-muted-foreground">{user.email}</p>
          </div>

          <div className="border-t" />

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Lock size={13} className="text-muted-foreground" />
                Password
              </label>
              {!showPasswordForm && (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="text-xs text-primary hover:opacity-70 transition-opacity font-medium"
                >
                  Change password
                </button>
              )}
            </div>

            {!showPasswordForm ? (
              <p className="text-sm px-3 py-2 border rounded-lg bg-muted/30 text-muted-foreground tracking-widest">••••••••</p>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password (min. 8 chars)"
                    className="w-full border rounded-lg px-3 pr-10 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full border rounded-lg px-3 pr-10 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdatePassword}
                    disabled={passLoading || !newPassword}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {passLoading ? 'Updating...' : 'Update password'}
                  </button>
                  <button
                    onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword('') }}
                    className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t px-5 py-4">
          <Link
            to="/terms"
            onClick={onClose}
            className="text-xs text-blue-500 hover:text-blue-600 hover:underline transition-colors"
          >
            Terms & Conditions
          </Link>
        </div>

      </div>
    </>
  )
})

// ── User Menu ─────────────────────────────────────────────────────────────────
const UserMenu = observer(() => {
  const { auth } = useStore()
  const navigate = useNavigate()
  const [gearOpen, setGearOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const gearRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) setGearOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!auth.currentUser) return null

  const { displayName, email, avatarUrl } = auth.currentUser
  const initial = displayName.charAt(0).toUpperCase()
  const avatarColor = MEMBER_COLORS[displayName.charCodeAt(0) % MEMBER_COLORS.length]

  const handleLogout = async () => {
    setGearOpen(false)
    await auth.logout()
    navigate('/login', { replace: true })
    toast.success('Logged out.')
  }

  return (
    <>
      <div className="flex items-center gap-2">

        {/* User avatar */}
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {initial}
          </div>
        )}
        <div className="hidden sm:block">
          <p className="text-sm font-medium leading-none">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
        </div>

        {/* Gear icon + dropdown */}
        <div ref={gearRef} className="relative">
          <button
            onClick={() => setGearOpen(v => !v)}
            className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${gearOpen ? 'bg-muted' : ''}`}
          >
            <Settings size={16} className="text-muted-foreground" />
          </button>

          {gearOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card rounded-xl border shadow-lg z-40 py-1 overflow-hidden">
              <button
                onClick={() => { setGearOpen(false); setShowProfile(true) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
              >
                <User size={14} className="text-muted-foreground" />
                My Profile
              </button>

              <div className="border-t mx-2 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left text-destructive"
              >
                <LogOut size={14} />
                Log out
              </button>
            </div>
          )}
        </div>

      </div>

      {showProfile && <ProfileDrawer onClose={() => setShowProfile(false)} />}
    </>
  )
})

export default UserMenu
