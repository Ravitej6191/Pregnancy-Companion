import { create } from 'zustand'

export interface AuthUser {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

interface AuthStore {
  user: AuthUser | null
  isSigningIn: boolean
  lastSyncedAt: string | null
  syncing: boolean
  syncError: string | null
  setUser: (user: AuthUser | null) => void
  setIsSigningIn: (v: boolean) => void
  setLastSyncedAt: (t: string | null) => void
  setSyncing: (v: boolean) => void
  setSyncError: (e: string | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isSigningIn: false,
  lastSyncedAt: localStorage.getItem('lastSyncedAt'),
  syncing: false,
  syncError: null,
  setUser: (user) => set({ user }),
  setIsSigningIn: (v) => set({ isSigningIn: v }),
  setLastSyncedAt: (t) => {
    if (t) localStorage.setItem('lastSyncedAt', t)
    else localStorage.removeItem('lastSyncedAt')
    set({ lastSyncedAt: t })
  },
  setSyncing: (v) => set({ syncing: v }),
  setSyncError: (e) => set({ syncError: e }),
}))
