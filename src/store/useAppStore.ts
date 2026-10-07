import { create } from 'zustand'
import type { PregnancyProfile } from '../types'

interface AppState {
  profile: PregnancyProfile | null
  setProfile: (p: PregnancyProfile | null) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  isOnboarding: boolean
  setIsOnboarding: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isOnboarding: false,
  setIsOnboarding: (v) => set({ isOnboarding: v }),
}))
