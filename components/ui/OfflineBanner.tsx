'use client'

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div className="sticky top-0 z-[60] border-b border-status-elevated/40 bg-status-elevated/10 px-4 py-2 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-status-elevated">
        Offline mode: entries may not sync until connection returns
      </p>
    </div>
  )
}
