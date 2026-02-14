import { Suspense } from 'react'
import StashClient from './StashClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Stash',
  description: 'Dose calendar and batch snapshot',
}

function StashSkeleton() {
  return (
    <div className="min-h-screen bg-base px-4 py-6 animate-pulse">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="h-8 w-24 rounded bg-elevated" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded bg-elevated" />
          <div className="h-10 flex-1 rounded bg-elevated" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, index) => (
            <div key={index} className="aspect-square rounded bg-elevated/60" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function StashPage() {
  return (
    <Suspense fallback={<StashSkeleton />}>
      <StashClient />
    </Suspense>
  )
}
