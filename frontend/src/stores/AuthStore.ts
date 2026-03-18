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
  private _root: RootStore // reserved for cross-store access

  constructor(root: RootStore) {
    this._root = root
    makeAutoObservable(this)
    this.init()
  }

  // Called once on app start — restores session if user was already logged in
  private async init() {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const user = await this.syncWithBackend(
        session.user,
        session.user.user_metadata?.full_name,
        session.access_token
      )
      runInAction(() => {
        this.currentUser = user
        this.isLoading = false
      })
    } else {
      runInAction(() => { this.isLoading = false })
    }

    // Listen for future login/logout events (e.g. Google OAuth callback)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = await this.syncWithBackend(
          session.user,
          session.user.user_metadata?.full_name,
          session.access_token
        )
        runInAction(() => { this.currentUser = user })
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

  async logout() {
    await supabase.auth.signOut()
    runInAction(() => { this.currentUser = null })
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
