// src/stores/NoteStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '../lib/api'
import type { Note } from '../types'
import type { RootStore } from './RootStore'

export class NoteStore {
  notes: Note[] = []
  isLoading = false
  error: string | null = null
  private root: RootStore

  constructor(root: RootStore) {
    this.root = root
    makeAutoObservable(this)
  }

  async fetchNotes(tripId: string) {
    runInAction(() => { this.isLoading = true; this.error = null })
    try {
      const res = await api.get<Note[]>(`/trips/${tripId}/notes`)
      runInAction(() => { this.notes = res.data })
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
    } finally {
      runInAction(() => { this.isLoading = false })
    }
  }

  async addNote(tripId: string, content: string) {
    const user = this.root.auth.currentUser
    if (!user) return
    const optimistic: Note = {
      id: 'optimistic-' + Date.now(), tripId,
      authorId: user.id, authorName: user.displayName,
      content, createdAt: new Date().toISOString(),
    }
    runInAction(() => { this.notes = [optimistic, ...this.notes] })
    try {
      const res = await api.post<Note>(`/trips/${tripId}/notes`, { content })
      runInAction(() => {
        this.notes = this.notes.map(n => n.id === optimistic.id ? res.data : n)
      })
    } catch (e) {
      runInAction(() => { this.notes = this.notes.filter(n => n.id !== optimistic.id) })
      throw e
    }
  }

  async editNote(tripId: string, noteId: string, content: string) {
    const original = this.notes.find(n => n.id === noteId)
    if (!original) return
    runInAction(() => {
      this.notes = this.notes.map(n => n.id === noteId ? { ...n, content, updatedAt: new Date().toISOString() } : n)
    })
    try {
      const res = await api.put<Note>(`/trips/${tripId}/notes/${noteId}`, { content })
      runInAction(() => { this.notes = this.notes.map(n => n.id === noteId ? res.data : n) })
    } catch (e) {
      runInAction(() => { this.notes = this.notes.map(n => n.id === noteId ? original : n) })
      throw e
    }
  }

  async deleteNote(tripId: string, noteId: string) {
    const original = [...this.notes]
    runInAction(() => { this.notes = this.notes.filter(n => n.id !== noteId) })
    try {
      await api.delete(`/trips/${tripId}/notes/${noteId}`)
    } catch (e) {
      runInAction(() => { this.notes = original })
      throw e
    }
  }
}
