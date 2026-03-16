// src/stores/AuthStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { supabase } from '../lib/supabase'
import { MOCK_USERS } from '../mocks/data'
import type { User } from '../types'
import type { RootStore } from './RootStore'

const USE_MOCK = true

export class AuthStore {
  currentUser: User | null = null
  isLoading = true // true on first load while session is checked
  error: string | null = null
  // @ts-ignore - root will be used in future
  private _root: RootStore

  constructor(root: RootStore) {
    this._root = root
    makeAutoObservable(this)
    this.init()
  }

  // Called once on app start — checks if user is already logged in
  private async init() {
    if (USE_MOCK) {
      runInAction(() => {
        this.currentUser = MOCK_USERS[0] // auto-logged in as 'You'
        this.isLoading = false
      })
      return // skip Supabase entirely
    }

    const { data: { session } } = await supabase.auth.getSession()
    runInAction(() => {
      this.currentUser = session?.user ? this.mapUser(session.user) : null
      this.isLoading = false
    })

    // Listen for future login/logout events
    supabase.auth.onAuthStateChange((_event, session) => {
      runInAction(() => {
        this.currentUser = session?.user ? this.mapUser(session.user) : null
      })
    })
  }

  get isLoggedIn() { return !!this.currentUser }

  async loginWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async loginWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) runInAction(() => { this.error = error.message })
  }

  async logout() {
    await supabase.auth.signOut()
    runInAction(() => { this.currentUser = null })
  }

  private mapUser(u: any): User {
    return {
      id: u.id,
      email: u.email,
      displayName: u.user_metadata?.full_name ?? u.email,
      avatarUrl: u.user_metadata?.avatar_url,
      defaultCurrency: 'USD'
    }
  }
}
