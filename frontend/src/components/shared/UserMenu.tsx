// src/components/shared/UserMenu.tsx
import { useState, useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, User, X, Pencil, Check, Camera, MonitorSmartphone, Trash2, Eye, EyeOff } from 'lucide-react'

import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'
import { supabase } from '../../lib/supabase'
import { getApiError } from '../../lib/utils'
import CustomSelect from './CustomSelect'
import { SUPPORTED_CURRENCIES } from '../../lib/currencies'

const PRONOUN_OPTIONS = [
  '', 'he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'any pronouns', 'prefer not to say',
]

const MEMBER_COLORS = ['#818cf8','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#facc15','#2dd4bf']

// ── Profile Drawer ─────────────────────────────────────────────────────────────
const ProfileDrawer = observer(({ onClose }: { onClose: () => void }) => {
  const { auth } = useStore()
  const navigate = useNavigate()
  // NOTE: all hooks must run before any early return — if the session expires
  // while the drawer is mounted (currentUser → null), returning above the hooks
  // changes the hook count mid-lifecycle and React crashes the whole tree.
  const user = auth.currentUser

  const validPronouns = PRONOUN_OPTIONS.includes(user?.pronouns ?? '') ? (user?.pronouns ?? '') : ''

  const [editingName, setEditingName] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [pronouns, setPronouns] = useState(validPronouns)
  const [defaultCurrency, setDefaultCurrency] = useState(user?.defaultCurrency ?? 'USD')
  const [nameLoading, setNameLoading] = useState(false)
  const [pronounsLoading, setPronounsLoading] = useState(false)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [logoutAllLoading, setLogoutAllLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Guard AFTER every hook (see note above)
  if (!user) return null

  const avatarColor = MEMBER_COLORS[user.displayName.charCodeAt(0) % MEMBER_COLORS.length]
  const initial = user.displayName.charAt(0).toUpperCase()

  const handleUpdateName = async () => {
    if (!displayName.trim()) return
    setNameLoading(true)
    try {
      await auth.updateDisplayName(displayName.trim())
      toast.success('Display name updated.')
      setEditingName(false)
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to update name.'))
    } finally {
      setNameLoading(false)
    }
  }

  const handleUpdateCurrency = async (currency: string) => {
    setDefaultCurrency(currency)
    setCurrencyLoading(true)
    try {
      await auth.updateDefaultCurrency(currency)
      toast.success('Default currency updated.')
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to update currency.'))
    } finally {
      setCurrencyLoading(false)
    }
  }

  const handleUpdatePronouns = async () => {
    setPronounsLoading(true)
    try {
      await auth.updatePronouns(pronouns)
      toast.success('Pronouns updated.')
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to update pronouns.'))
    } finally {
      setPronounsLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return }
    setAvatarLoading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw new Error(uploadError.message)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await auth.updateAvatarUrl(publicUrl)
      toast.success('Profile picture updated.')
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to upload picture.'))
    } finally {
      setAvatarLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true)
    try {
      await auth.logoutAllDevices()
      navigate('/login', { replace: true })
      toast.success('Signed out of all devices.')
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to sign out.'))
    } finally {
      setLogoutAllLoading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true)
    setShowAvatarMenu(false)
    try {
      await auth.updateAvatarUrl('')
      toast.success('Profile picture removed.')
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to remove picture.'))
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return }
    setPassLoading(true)
    try {
      await auth.updatePassword(newPassword)
      toast.success('Password updated.')
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to update password.'))
    } finally {
      setPassLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await auth.deleteAccount()
      navigate('/login', { replace: true })
      toast.success('Account deleted.')
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to delete account.'))
    } finally {
      setDeleteLoading(false)
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

          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initial}
                </div>
              )}
              <button
                onClick={() => user.avatarUrl ? setShowAvatarMenu(v => !v) : fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                <Camera size={11} />
              </button>
              {showAvatarMenu && (
                <div className="absolute left-0 top-full mt-1 bg-card border rounded-xl shadow-lg z-10 py-1 w-40 overflow-hidden">
                  <button
                    onClick={() => { setShowAvatarMenu(false); fileInputRef.current?.click() }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                  >
                    Change photo
                  </button>
                  <button
                    onClick={handleRemoveAvatar}
                    className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    Remove photo
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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
            {editingName ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUpdateName(); if (e.key === 'Escape') { setEditingName(false); setDisplayName(user.displayName) } }}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={nameLoading || !displayName.trim() || displayName === user.displayName}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {nameLoading ? '...' : <Check size={14} />}
                </button>
                <button
                  onClick={() => { setEditingName(false); setDisplayName(user.displayName) }}
                  className="px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 border rounded-lg bg-background">
                <span className="text-sm">{user.displayName}</span>
                <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Pronouns */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1">
              Pronouns
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <CustomSelect
                value={pronouns}
                onChange={setPronouns}
                options={[
                  { value: '', label: 'Select pronouns' },
                  ...PRONOUN_OPTIONS.filter(p => p).map(p => ({ value: p, label: p })),
                ]}
                className="flex-1"
                buttonClassName="py-2 text-sm"
              />
              <button
                onClick={handleUpdatePronouns}
                disabled={pronounsLoading || pronouns === validPronouns}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pronounsLoading ? '...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Default Currency */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1">
              Default currency
              {currencyLoading && <span className="text-xs text-muted-foreground font-normal">Saving...</span>}
            </label>
            <CustomSelect
              value={defaultCurrency}
              onChange={handleUpdateCurrency}
              options={SUPPORTED_CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
              className="w-full"
              buttonClassName="py-2 text-sm"
            />
          </div>

          {/* Email — read only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm px-3 py-2 border rounded-lg bg-muted/30 text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground/60">Email cannot be changed.</p>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-muted/30 hover:bg-muted transition-colors"
            >
              <span className="text-sm text-muted-foreground tracking-widest">••••••••</span>
              <span className="text-xs text-primary font-medium">Change</span>
            </button>
          </div>

          <div className="border-t" />

          {/* Sign out all devices */}
          <button
            onClick={handleLogoutAll}
            disabled={logoutAllLoading}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm hover:bg-muted transition-colors text-left disabled:opacity-50"
          >
            <MonitorSmartphone size={14} className="text-muted-foreground shrink-0" />
            <span>{logoutAllLoading ? 'Signing out...' : 'Sign out of all devices'}</span>
          </button>

          {/* Delete account */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-destructive/30 text-sm hover:bg-destructive/5 transition-colors text-left text-destructive"
            >
              <Trash2 size={14} className="shrink-0" />
              <span>Delete account</span>
            </button>
          ) : (
            <div className="rounded-lg border border-destructive/30 p-4 space-y-3 bg-destructive/5">
              <p className="text-sm font-medium text-destructive">Delete your account?</p>
              <p className="text-xs text-muted-foreground">This is permanent and cannot be undone. All your data will be removed.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword('') }} />
          <div className="relative bg-card rounded-2xl border shadow-xl w-full max-w-sm p-6 space-y-4 z-[61]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Change Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword('') }} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New password</label>
                <div className="relative">
                  <input
                    autoFocus
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full border rounded-lg px-3 pr-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    onKeyDown={e => { if (e.key === 'Enter') handleChangePassword() }}
                    className="w-full border rounded-lg px-3 pr-10 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleChangePassword}
                disabled={passLoading || !newPassword || !confirmPassword}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {passLoading ? 'Updating...' : 'Update password'}
              </button>
              <button
                onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword('') }}
                className="px-4 py-2.5 rounded-lg border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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

  const handleLogout = async () => {
    setGearOpen(false)
    await auth.logout()
    navigate('/login', { replace: true })
    toast.success('Logged out.')
  }

  return (
    <>
      <div className="flex items-center">

        {/* Gear icon + dropdown */}
        <div ref={gearRef} className="relative">
          <button
            onClick={() => setGearOpen(v => !v)}
            className={`p-1.5 rounded-lg hover:bg-black/8 transition-colors ${gearOpen ? 'bg-black/8' : ''}`}
          >
            <Settings size={20} strokeWidth={3} className="text-foreground/80" />
          </button>

          {gearOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card rounded-xl border shadow-lg z-40 py-1 overflow-hidden">
              <button
                onClick={() => { setGearOpen(false); setShowProfile(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
              >
                <User size={13} className="text-muted-foreground" />
                My Profile
              </button>

              <div className="border-t mx-2 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted transition-colors text-left text-destructive"
              >
                <LogOut size={13} />
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
