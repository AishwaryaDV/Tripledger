// src/stores/NoteStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { mockHandlers } from '../mocks/handlers'
import type { Note } from '../types'
import type { RootStore } from './RootStore'

const USE_MOCK = true

export class NoteStore {
  notes: Note[] = []
  isLoading = false
  private root: RootStore

  constructor(root: RootStore) {
    this.root = root
    makeAutoObservable(this)
  }

  async fetchNotes(tripId: string) {
    runInAction(() => { this.isLoading = true })
    try {
      const data = USE_MOCK ? await mockHandlers.getNotes(tripId) : []
      runInAction(() => { this.notes = data })
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
      const confirmed = USE_MOCK
        ? await mockHandlers.addNote(tripId, user.id, user.displayName, content)
        : optimistic
      runInAction(() => {
        this.notes = this.notes.map(n => n.id === optimistic.id ? confirmed : n)
      })
    } catch {
      runInAction(() => { this.notes = this.notes.filter(n => n.id !== optimistic.id) })
    }
  }

  async editNote(noteId: string, content: string) {
    const original = this.notes.find(n => n.id === noteId)
    if (!original) return
    runInAction(() => {
      this.notes = this.notes.map(n => n.id === noteId ? { ...n, content, updatedAt: new Date().toISOString() } : n)
    })
    try {
      const confirmed = USE_MOCK ? await mockHandlers.editNote(noteId, content) : original
      runInAction(() => { this.notes = this.notes.map(n => n.id === noteId ? confirmed : n) })
    } catch {
      runInAction(() => { this.notes = this.notes.map(n => n.id === noteId ? original : n) })
    }
  }

  async deleteNote(noteId: string) {
    const original = [...this.notes]
    runInAction(() => { this.notes = this.notes.filter(n => n.id !== noteId) })
    try {
      if (USE_MOCK) await mockHandlers.deleteNote(noteId)
    } catch {
      runInAction(() => { this.notes = original })
    }
  }
}
