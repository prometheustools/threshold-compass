import { create } from 'zustand'
import type { User, Batch, CarryoverResult, ThresholdRange } from '@/types'

interface AppState {
  user: User | null
  activeBatch: Batch | null
  carryover: CarryoverResult
  thresholdRange: ThresholdRange | null
  recentCorrectionIds: string[]

  setUser: (user: User | null) => void
  setActiveBatch: (batch: Batch | null) => void
  setCarryover: (carryover: CarryoverResult) => void
  setThresholdRange: (range: ThresholdRange | null) => void
  addRecentCorrectionId: (id: string) => void
}

const DEFAULT_CARRYOVER: CarryoverResult = {
  percentage: 0,
  tier: 'clear',
  effective_multiplier: 1.0,
  hours_to_clear: null,
  message: 'Full sensitivity expected.',
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  activeBatch: null,
  carryover: DEFAULT_CARRYOVER,
  thresholdRange: null,
  recentCorrectionIds: [],

  setUser: (user) => set({ user }),
  setActiveBatch: (activeBatch) => set({ activeBatch }),
  setCarryover: (carryover) => set({ carryover }),
  setThresholdRange: (thresholdRange) => set({ thresholdRange }),
  addRecentCorrectionId: (id) =>
    set((state) => ({
      recentCorrectionIds: [...state.recentCorrectionIds.slice(-2), id],
    })),
}))
