import { Suspense } from 'react'
import WorkshopClient from './WorkshopClient'
import drillsData from '@/content/workshop-drills.json'
import modelsData from '@/content/workshop-models.json'

export const metadata = {
  title: 'Workshop',
  description: 'Learn the core concepts of threshold microdosing practice',
}

export default function WorkshopPage() {
  return (
    <Suspense fallback={<WorkshopSkeleton />}>
      <WorkshopClient drills={drillsData.drills} models={modelsData.models} />
    </Suspense>
  )
}

function WorkshopSkeleton() {
  return (
    <div className="min-h-screen bg-base p-4 text-ivory animate-pulse">
      <div className="mb-6 h-8 w-32 rounded bg-elevated" />
      <div className="flex gap-2 mb-6">
        <div className="h-10 w-24 rounded-full bg-elevated" />
        <div className="h-10 w-24 rounded-full bg-elevated" />
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-card bg-surface" />
        ))}
      </div>
    </div>
  )
}
