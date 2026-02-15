'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GuidanceLevel, NorthStar, User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { clearAnonymousSession, resolveCurrentUserId } from '@/lib/auth/anonymous'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import Modal from '@/components/ui/Modal'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type NotificationKey =
  | 'post_dose_reminder'
  | 'pattern_alerts'
  | 'integration_prompt'
  | 'end_of_day_reflection'

type NotificationPreferences = Record<NotificationKey, boolean>

const notificationStorageKey = 'threshold_compass_notifications'
const medicationStorageKey = 'threshold_compass_medications'

const defaultNotifications: NotificationPreferences = {
  post_dose_reminder: true,
  pattern_alerts: true,
  integration_prompt: true,
  end_of_day_reflection: false,
}

const northStarOptions: Array<{ value: NorthStar; label: string; description: string }> = [
  { value: 'clarity', label: 'Clarity', description: 'Focus and cognitive precision' },
  { value: 'connection', label: 'Connection', description: 'Relational openness and empathy' },
  { value: 'creativity', label: 'Creativity', description: 'Divergent thinking and flow' },
  { value: 'calm', label: 'Calm', description: 'Regulation and emotional steadiness' },
  { value: 'exploration', label: 'Exploration', description: 'Discovery and experimentation' },
]

const guidanceOptions: Array<{ value: GuidanceLevel; label: string; description: string }> = [
  { value: 'minimal', label: 'Minimal', description: 'Low-touch UI and fewer prompts' },
  { value: 'guided', label: 'Guided', description: 'Balanced support and reminders' },
  { value: 'experienced', label: 'Experienced', description: 'Lean defaults for established practice' },
]

const notificationItems: Array<{ key: NotificationKey; label: string; description: string }> = [
  {
    key: 'post_dose_reminder',
    label: 'Post-dose reminder',
    description: 'Prompt to complete STI and threshold-feel logging.',
  },
  {
    key: 'pattern_alerts',
    label: 'Pattern alerts',
    description: 'Highlight new confidence signals in insights.',
  },
  {
    key: 'integration_prompt',
    label: 'Integration prompt',
    description: 'Nudge for brief reflection after active window.',
  },
  {
    key: 'end_of_day_reflection',
    label: 'End-of-day reflection',
    description: 'Prompt for same-day summary.',
  },
]

function loadNotificationsFromStorage(): NotificationPreferences {
  if (typeof window === 'undefined') return defaultNotifications

  try {
    const raw = window.localStorage.getItem(notificationStorageKey)
    if (!raw) return defaultNotifications

    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>
    return {
      post_dose_reminder: parsed.post_dose_reminder ?? defaultNotifications.post_dose_reminder,
      pattern_alerts: parsed.pattern_alerts ?? defaultNotifications.pattern_alerts,
      integration_prompt: parsed.integration_prompt ?? defaultNotifications.integration_prompt,
      end_of_day_reflection: parsed.end_of_day_reflection ?? defaultNotifications.end_of_day_reflection,
    }
  } catch {
    return defaultNotifications
  }
}

function saveNotificationsToStorage(value: NotificationPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(notificationStorageKey, JSON.stringify(value))
}

function loadMedicationsFromStorage(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(medicationStorageKey)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
  } catch {
    return []
  }
}

function saveMedicationsToStorage(value: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(medicationStorageKey, JSON.stringify(value))
}

function StatusBadge({ status }: { status: SaveStatus }) {
  if (status === 'saving') return <span className="text-xs text-status-mild">Saving...</span>
  if (status === 'saved') return <span className="text-xs text-status-clear">Saved</span>
  if (status === 'error') return <span className="text-xs text-status-elevated">Error</span>
  return null
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [redoLoading, setRedoLoading] = useState(false)

  const [northStar, setNorthStar] = useState<NorthStar>('clarity')
  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel>('guided')
  const [sensitivity, setSensitivity] = useState(3)
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications)
  const [medications, setMedications] = useState<string[]>([])
  const [newMedication, setNewMedication] = useState('')

  const [northStarStatus, setNorthStarStatus] = useState<SaveStatus>('idle')
  const [guidanceStatus, setGuidanceStatus] = useState<SaveStatus>('idle')
  const [sensitivityStatus, setSensitivityStatus] = useState<SaveStatus>('idle')
  const [notificationStatus, setNotificationStatus] = useState<SaveStatus>('idle')
  const [medicationStatus, setMedicationStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)

      if (!anonUserId) {
        router.push('/autologin')
        return
      }

      const { data } = await supabase.from('users').select('*').eq('id', anonUserId).single()
      const typedUser = (data as User | null) ?? null

      setUser(typedUser)
      setUserId(anonUserId)

      if (typedUser) {
        setNorthStar(typedUser.north_star)
        setGuidanceLevel(typedUser.guidance_level)
        setSensitivity(typedUser.sensitivity)
      }

      setNotifications(loadNotificationsFromStorage())
      setMedications(loadMedicationsFromStorage())
      setLoading(false)
    }

    void load()
  }, [router])

  const saveProfilePatch = async (
    patch: Partial<Pick<User, 'north_star' | 'guidance_level' | 'sensitivity'>>,
    setStatus: (status: SaveStatus) => void
  ) => {
    if (!userId) return

    setStatus('saving')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single()

    if (error) {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
      return
    }

    setUser((data as User | null) ?? user)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const handleNorthStarChange = (value: NorthStar) => {
    setNorthStar(value)
    void saveProfilePatch({ north_star: value }, setNorthStarStatus)
  }

  const handleGuidanceChange = (value: GuidanceLevel) => {
    setGuidanceLevel(value)
    void saveProfilePatch({ guidance_level: value }, setGuidanceStatus)
  }

  const handleSensitivityChange = (value: number) => {
    const clamped = Math.max(1, Math.min(5, value))
    setSensitivity(clamped)
    void saveProfilePatch({ sensitivity: clamped }, setSensitivityStatus)
  }

  const handleNotificationToggle = (key: NotificationKey) => {
    setNotificationStatus('saving')
    setNotifications((previous) => {
      const next = { ...previous, [key]: !previous[key] }
      saveNotificationsToStorage(next)
      return next
    })
    setTimeout(() => setNotificationStatus('saved'), 200)
    setTimeout(() => setNotificationStatus('idle'), 1800)
  }

  const addMedication = () => {
    const trimmed = newMedication.trim()
    if (!trimmed) return

    setMedicationStatus('saving')
    setMedications((previous) => {
      const exists = previous.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())
      const next = exists ? previous : [...previous, trimmed]
      saveMedicationsToStorage(next)
      return next
    })
    setNewMedication('')
    setTimeout(() => setMedicationStatus('saved'), 200)
    setTimeout(() => setMedicationStatus('idle'), 1800)
  }

  const removeMedication = (value: string) => {
    setMedicationStatus('saving')
    setMedications((previous) => {
      const next = previous.filter((entry) => entry !== value)
      saveMedicationsToStorage(next)
      return next
    })
    setTimeout(() => setMedicationStatus('saved'), 200)
    setTimeout(() => setMedicationStatus('idle'), 1800)
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const response = await fetch('/api/export')
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `threshold-compass-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export data. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImportLoading(true)
    try {
      const raw = await file.text()
      const payload = JSON.parse(raw)

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Import failed')
      }

      alert('Import complete. Refreshing data views.')
      router.refresh()
    } catch (err) {
      console.error('Import error:', err)
      alert(err instanceof Error ? err.message : 'Failed to import data.')
    } finally {
      setImportLoading(false)
    }
  }

  const handleReset = () => {
    clearAnonymousSession()
    localStorage.removeItem('compass_preview_mode')
    router.push('/autologin')
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)

      if (!anonUserId) {
        router.push('/autologin')
        return
      }

      const { error } = await supabase.from('users').delete().eq('id', anonUserId)
      if (error) throw error

      clearAnonymousSession()
      localStorage.removeItem('compass_preview_mode')
      router.push('/autologin')
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete account. Please try again.')
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleRedoOnboarding = async () => {
    if (!userId) return

    setRedoLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ onboarding_complete: false, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      localStorage.removeItem('compass_preview_mode')
      localStorage.removeItem('compass_first_visit_shown')
      router.push('/onboarding?redo=1')
    } catch (err) {
      console.error('Redo onboarding error:', err)
      alert('Unable to restart onboarding right now.')
    } finally {
      setRedoLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base px-4 py-8 text-ivory">
        <div className="mx-auto w-full max-w-xl">
          <Card padding="lg">
            <LoadingState message="loading" size="md" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base px-4 py-8 text-ivory animate-[fadeIn_800ms_ease-out]">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Settings</p>
          <h1 className="mt-2 font-sans text-2xl">Profile and Preferences</h1>
        </div>

        <Card padding="lg">
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Account</p>
          <div className="mt-3 space-y-2 text-sm text-bone">
            <p>
              Email: <span className="font-mono text-ivory">{user?.email}</span>
            </p>
            <p>
              Substance: <span className="font-mono text-ivory">{user?.substance_type}</span>
            </p>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-widest uppercase text-bone">North Star</p>
            <StatusBadge status={northStarStatus} />
          </div>
          <p className="mt-2 text-sm text-bone">Choose the direction that anchors your protocol.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {northStarOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleNorthStarChange(option.value)}
                className={`rounded-button border px-3 py-3 text-left transition-settle ${
                  northStar === option.value
                    ? 'border-orange bg-orange/15 text-ivory'
                    : 'border-ember/20 bg-elevated text-bone hover:border-ember/50'
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-widest">{option.label}</p>
                <p className="mt-1 text-xs">{option.description}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-widest uppercase text-bone">Guidance Level</p>
            <StatusBadge status={guidanceStatus} />
          </div>
          <div className="mt-3 space-y-2">
            {guidanceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleGuidanceChange(option.value)}
                className={`w-full rounded-button border px-3 py-3 text-left transition-settle ${
                  guidanceLevel === option.value
                    ? 'border-orange bg-orange/15 text-ivory'
                    : 'border-ember/20 bg-elevated text-bone hover:border-ember/50'
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-widest">{option.label}</p>
                <p className="mt-1 text-xs">{option.description}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-widest uppercase text-bone">Sensitivity</p>
            <StatusBadge status={sensitivityStatus} />
          </div>
          <p className="mt-2 text-sm text-bone">Calibrates conservative recommendations. Current: {sensitivity}/5</p>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={sensitivity}
            onChange={(event) => handleSensitivityChange(Number(event.target.value))}
            className="mt-3 w-full accent-orange"
            aria-label="Sensitivity level"
          />
          <div className="mt-3 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleSensitivityChange(value)}
                className={`rounded-button px-2 py-2 text-sm font-mono transition-settle ${
                  sensitivity === value ? 'bg-orange text-base' : 'bg-elevated text-bone'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-widest uppercase text-bone">Notifications</p>
            <StatusBadge status={notificationStatus} />
          </div>
          <p className="mt-2 text-sm text-bone">
            Saved locally on this device for now. Server-side notification sync is pending.
          </p>
          <div className="mt-3 space-y-3">
            {notificationItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 rounded-button border border-ember/20 bg-elevated px-3 py-3">
                <div>
                  <p className="text-sm text-ivory">{item.label}</p>
                  <p className="text-xs text-bone">{item.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNotificationToggle(item.key)}
                  className={`h-7 w-12 rounded-full p-1 transition-settle ${
                    notifications[item.key] ? 'bg-orange' : 'bg-ash/40'
                  }`}
                  role="switch"
                  aria-checked={notifications[item.key]}
                  aria-label={item.label}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-ivory transition-transform ${
                      notifications[item.key] ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-widest uppercase text-bone">Medication Safety List</p>
            <StatusBadge status={medicationStatus} />
          </div>
          <p className="mt-2 text-sm text-bone">
            This list is used for contraindication warnings during dose logging. Stored locally on this device.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newMedication}
              onChange={(event) => setNewMedication(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addMedication()
                }
              }}
              placeholder="e.g. Sertraline 50mg"
              className="w-full rounded-button border border-ember/30 bg-elevated px-3 py-2 text-sm text-ivory focus:border-orange focus:outline-none"
              aria-label="Medication name"
            />
            <button
              type="button"
              onClick={addMedication}
              className="rounded-button bg-orange px-3 py-2 font-mono text-xs uppercase tracking-widest text-base"
            >
              Add
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {medications.length === 0 ? (
              <p className="text-xs text-ash">No medications added.</p>
            ) : (
              medications.map((medication) => (
                <div
                  key={medication}
                  className="flex items-center justify-between rounded-button border border-ember/20 bg-elevated px-3 py-2"
                >
                  <span className="text-sm text-ivory">{medication}</span>
                  <button
                    type="button"
                    onClick={() => removeMedication(medication)}
                    className="text-xs text-status-elevated hover:opacity-80"
                    aria-label={`Remove ${medication}`}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card padding="lg">
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Data Portability</p>
          <p className="mt-2 text-sm text-bone">
            Download all your data as JSON, or import a previous export.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-3 w-full"
            onClick={handleExport}
            loading={exportLoading}
          >
            {exportLoading ? 'Exporting...' : 'Export All Data'}
          </Button>
          <label className="mt-2 block">
            <span className="sr-only">Import JSON backup</span>
            <input
              type="file"
              accept="application/json"
              onChange={handleImport}
              disabled={importLoading}
              className="hidden"
              id="import-json"
            />
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="mt-2 w-full"
              loading={importLoading}
              onClick={() => document.getElementById('import-json')?.click()}
            >
              {importLoading ? 'Importing...' : 'Import JSON Backup'}
            </Button>
          </label>
        </Card>

        <Card padding="lg" className="border-status-mild/30">
          <p className="font-mono text-xs tracking-widest uppercase text-status-mild">Developer Tools</p>
          <p className="mt-2 text-sm text-bone">
            Re-run onboarding with your current account for migration and UX testing.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-3 w-full"
            onClick={handleRedoOnboarding}
            loading={redoLoading}
          >
            {redoLoading ? 'Restarting...' : 'Redo Onboarding (Keep Data)'}
          </Button>
        </Card>

        <Card padding="lg" className="border-ember/20">
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Account Actions</p>
          <div className="mt-4 space-y-3">
            <Button variant="secondary" size="lg" className="w-full" onClick={handleReset}>
              Reset Session (New Anonymous User)
            </Button>
            <Button variant="danger" size="lg" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
              Delete Account and Data
            </Button>
          </div>
        </Card>

        <Card padding="md" className="bg-elevated/30">
          <p className="font-mono text-xs tracking-widest uppercase text-ash">Privacy Note</p>
          <p className="mt-2 text-xs leading-relaxed text-bone">
            Your data is stored in your Supabase project and scoped to your anonymous auth user ID.
            You can export or delete your data at any time.
          </p>
        </Card>
      </div>

      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Account?">
        <div className="space-y-4">
          <p className="text-sm text-bone">This permanently deletes all profile, batch, dose, and check-in data.</p>
          <p className="text-sm text-status-elevated">This action cannot be undone.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDeleteAccount}
              loading={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
