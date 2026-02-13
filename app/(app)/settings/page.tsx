'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { clearAnonymousSession, resolveCurrentUserId } from '@/lib/auth/anonymous'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import Modal from '@/components/ui/Modal'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const anonUserId = await resolveCurrentUserId(supabase)
      
      if (!anonUserId) {
        router.push('/autologin')
        return
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', anonUserId)
        .single()

      setUser((data as User | null) ?? null)
      setLoading(false)
    }

    void load()
  }, [router])

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

      // Delete user data (cascade will handle related records)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', anonUserId)

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
          <h1 className="mt-2 font-sans text-2xl">Account</h1>
        </div>

        {/* Profile Card */}
        <Card padding="lg">
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Profile</p>
          <div className="mt-3 space-y-2">
            <p className="text-sm text-bone">
              Email: <span className="font-mono text-ivory">{user?.email}</span>
            </p>
            <p className="text-sm text-bone">
              Substance: <span className="font-mono text-ivory">{user?.substance_type}</span>
            </p>
            <p className="text-sm text-bone">
              North Star: <span className="font-mono text-ivory">{user?.north_star}</span>
            </p>
            <p className="text-sm text-bone">
              Guidance: <span className="font-mono text-ivory">{user?.guidance_level}</span>
            </p>
            <p className="text-sm text-bone">
              Sensitivity: <span className="font-mono text-ivory">{user?.sensitivity}/5</span>
            </p>
          </div>
        </Card>

        {/* Data Export Card */}
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

        {/* Account Actions */}
        <Card padding="lg" className="border-ember/20">
          <p className="font-mono text-xs tracking-widest uppercase text-bone">Account Actions</p>
          
          <div className="mt-4 space-y-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleReset}
            >
              Reset Session (New Anonymous User)
            </Button>
            
            <Button
              variant="danger"
              size="lg"
              className="w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account & Data
            </Button>
          </div>
        </Card>

        {/* Info Card */}
        <Card padding="md" className="bg-elevated/30">
          <p className="font-mono text-xs tracking-widest uppercase text-ash">
            Privacy Note
          </p>
          <p className="mt-2 text-xs text-bone leading-relaxed">
            Your data is stored in your Supabase project and scoped to your anonymous auth user ID.
            We never share your substance data with third parties. You can export or delete
            your data at any time. Reset Session signs you out and generates a new anonymous
            account on next visit.
          </p>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Account?"
      >
        <div className="space-y-4">
          <p className="text-sm text-bone">
            This will permanently delete all your data including:
          </p>
          <ul className="list-disc list-inside text-sm text-bone space-y-1">
            <li>Your user profile</li>
            <li>All batches and dose logs</li>
            <li>All check-ins and threshold ranges</li>
          </ul>
          <p className="text-sm text-status-elevated">
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
            >
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
