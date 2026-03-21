// src/lib/api.ts
import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // e.g. https://api.tripleder.com
  timeout: 30_000,
})

// Before every request — grab fresh JWT from Supabase and attach it
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// If we get a 401 (token expired) — log the user out
// Skip /auth/me since it can 401 during signup before the session is cached
api.interceptors.response.use(
  res => res,
  async (error) => {
    const url = error.config?.url ?? ''
    if (error.response?.status === 401 && !url.includes('/auth/me')) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
