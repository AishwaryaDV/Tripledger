// src/stores/AuthStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import type { User } from '../types'
import type { RootStore } from './RootStore'

export class AuthStore {
  currentUser: User | null = null
  isLoading = true // true on first load while session is checked
  error: string | null = null
  constructor(_root: RootStore) {
    makeAutoObservable(this)
    this.init()
  }

  // Called once on app start — restores session if user was already logged in.
  // We rely on onAuthStateChange(INITIAL_SESSION) instead of a bare getSession() call so
  // that after a Google OAuth redirect the PKCE code exchange completes before we mark
  // auth as ready. We use setTimeout(0) before calling syncWithBackend to ensure the API
  // call (and its getSession() in the request interceptor) runs outside the
  // onAuthStateChange callback context, avoiding potential Supabase internal lock issues.
  private init() {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          setTimeout(async () => {
            const user = await this.syncWithBackend(
              session.user,
              session.user.user_metadata?.full_name,
              session.access_token
            )
            runInAction(() => { this.currentUser = user; this.isLoading = false })
          }, 0)
        } else {
          runInAction(() => { this.isLoading = false })
        }
      } else if (session?.user) {
        // SIGNED_IN (email login or OAuth), TOKEN_REFRESHED, etc.
        setTimeout(async () => {
          const user = await this.syncWithBackend(
            session.user,
            session.user.user_metadata?.full_name,
            session.access_token
          )
          runInAction(() => { this.currentUser = user })
        }, 0)
      } else {
        runInAction(() => { this.currentUser = null })
      }
    })
  }

  get isLoggedIn() { return !!this.currentUser }

  async loginWithGoogle() {
    runInAction(() => { this.error = null })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
    if (error) runInAction(() => { this.error = error.message })
  }

  async loginWithEmail(email: string, password: string) {
    runInAction(() => { this.error = null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      runInAction(() => { this.error = error.message })
      throw new Error(error.message)
    }
    if (data.user && data.session) {
      const user = await this.syncWithBackend(data.user, undefined, data.session.access_token)
      runInAction(() => { this.currentUser = user })
    }
  }

  async signUp(email: string, password: string, displayName: string) {
    runInAction(() => { this.error = null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      runInAction(() => { this.error = error.message })
      throw new Error(error.message)
    }
    if (data.user && data.session) {
      const user = await this.syncWithBackend(data.user, displayName, data.session.access_token)
      runInAction(() => { this.currentUser = user })
    }
  }

  async updateDisplayName(name: string) {
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
    if (error) throw new Error(error.message)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await api.post('/auth/me', { display_name: name }, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
    }
    runInAction(() => {
      if (this.currentUser) this.currentUser = { ...this.currentUser, displayName: name }
    })
  }

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
  }

  async sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw new Error(error.message)
  }

  async updatePronouns(pronouns: string) {
    const { error } = await supabase.auth.updateUser({ data: { pronouns } })
    if (error) throw new Error(error.message)
    runInAction(() => {
      if (this.currentUser) this.currentUser = { ...this.currentUser, pronouns }
    })
  }

  async logout() {
    await supabase.auth.signOut()
    runInAction(() => { this.currentUser = null })
  }

  async logoutAllDevices() {
    await supabase.auth.signOut({ scope: 'global' })
    runInAction(() => { this.currentUser = null })
  }

  async deleteAccount() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    await api.delete('/auth/me', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    await supabase.auth.signOut()
    runInAction(() => { this.currentUser = null })
  }

  async updateDefaultCurrency(currency: string) {
    await api.patch('/auth/me/currency', { default_currency: currency })
    runInAction(() => {
      if (this.currentUser) this.currentUser = { ...this.currentUser, defaultCurrency: currency }
    })
  }

  async updateAvatarUrl(avatarUrl: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    await api.patch('/auth/me/avatar', { avatar_url: avatarUrl || null }, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    runInAction(() => {
      if (this.currentUser) this.currentUser = { ...this.currentUser, avatarUrl: avatarUrl || undefined }
    })
  }

  // Calls POST /auth/me — upserts the user in our DB and returns their profile
  private async syncWithBackend(supabaseUser: any, displayName?: string, accessToken?: string): Promise<User> {
    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      const { data } = await api.post('/auth/me', { display_name: displayName ?? null }, { headers })
      return {
        id: data.id,
        email: data.email,
        displayName: data.display_name ?? supabaseUser.email,
        avatarUrl: data.avatar_url ?? null,
        defaultCurrency: data.default_currency ?? 'USD',
        pronouns: supabaseUser.user_metadata?.pronouns ?? undefined,
      }
    } catch {
      // If backend is unreachable, fall back to Supabase user data
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        displayName: displayName ?? supabaseUser.user_metadata?.full_name ?? supabaseUser.email,
        avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
        defaultCurrency: 'USD',
      }
    }
  }
}
