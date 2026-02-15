import { create } from 'zustand'
import type { User, Batch, CarryoverResult, ThresholdRange, DoseLog } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { resolveCurrentUserId } from '@/lib/auth/anonymous'

interface AppState {
  user: User | null
  activeBatch: Batch | null
  carryover: CarryoverResult
  thresholdRange: ThresholdRange | null
  recentCorrectionIds: string[]
  lastDose: DoseLog | null

  setUser: (user: User | null) => void
  setActiveBatch: (batch: Batch | null) => void
  setCarryover: (carryover: CarryoverResult) => void
  setThresholdRange: (range: ThresholdRange | null) => void
  addRecentCorrectionId: (id: string) => void
  setLastDose: (dose: DoseLog | null) => void
  fetchLastDose: () => Promise<void>
}

const DEFAULT_CARRYOVER: CarryoverResult = {
  percentage: 0,
  tier: 'clear',
  effective_multiplier: 1.0,
  hours_to_clear: null,
  message: 'Full sensitivity expected.',
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  activeBatch: null,
  carryover: DEFAULT_CARRYOVER,
  thresholdRange: null,
  recentCorrectionIds: [],
  lastDose: null,

  setUser: (user) => set({ user }),
  setActiveBatch: (activeBatch) => set({ activeBatch }),
  setCarryover: (carryover) => set({ carryover }),
  setThresholdRange: (thresholdRange) => set({ thresholdRange }),
  addRecentCorrectionId: (id) =>
    set((state) => ({
      recentCorrectionIds: [...state.recentCorrectionIds.slice(-2), id],
    })),
  setLastDose: (lastDose) => set({ lastDose }),
  fetchLastDose: async () => {
    try {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)
      
      if (!anonUserId) {
        set({ lastDose: null })
        return
      }

      const { data, error } = await supabase
        .from('dose_logs')
        .select('*')
        .eq('user_id', anonUserId)
        .order('dosed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching last dose:', error)
        set({ lastDose: null })
        return
      }

      set({ lastDose: data as DoseLog | null })
    } catch (error) {
      console.error('Error in fetchLastDose:', error)
      set({ lastDose: null })
    }
  },
}))
