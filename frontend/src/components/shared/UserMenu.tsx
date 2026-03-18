// src/components/shared/UserMenu.tsx
import { useState, useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Settings, LogOut, X, ChevronDown, User, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../../hooks/useStore'

// ── Settings Modal ────────────────────────────────────────────────────────────
const SettingsModal = observer(({ onClose }: { onClose: () => void }) => {
  const { auth } = useStore()

  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [passLoading, setPassLoading] = useState(false)

  // Close on Escape
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

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return }
    setPassLoading(true)
    try {
      await auth.updatePassword(newPassword)
      toast.success('Password updated.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update password.')
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-card rounded-xl border shadow-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold">Account Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-6">

          {/* Update display name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User size={14} className="text-muted-foreground" />
              Update display name
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleUpdateName}
                disabled={nameLoading || !displayName.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {nameLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="border-t" />

          {/* Change password */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock size={14} className="text-muted-foreground" />
              Change password
            </div>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min. 8 chars)"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleUpdatePassword}
              disabled={passLoading || !newPassword}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {passLoading ? 'Updating...' : 'Update password'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
})

// ── User Menu ─────────────────────────────────────────────────────────────────
const UserMenu = observer(() => {
  const { auth } = useStore()
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!auth.currentUser) return null

  const { displayName, email, avatarUrl } = auth.currentUser
  const initial = displayName.charAt(0).toUpperCase()

  const handleLogout = async () => {
    setOpen(false)
    await auth.logout()
    toast.success('Logged out.')
  }

  return (
    <>
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
          </div>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
              {initial}
            </div>
          )}
          <ChevronDown size={14} className={`text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-card rounded-xl border shadow-lg z-40 py-1 overflow-hidden">

            {/* User info header */}
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>

            {/* Settings */}
            <button
              onClick={() => { setOpen(false); setShowSettings(true) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
            >
              <Settings size={14} className="text-muted-foreground" />
              Settings
            </button>

            <div className="border-t mx-2 my-1" />

            {/* Logout */}
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

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
})

export default UserMenu
