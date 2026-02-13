'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GroundingExercise from '@/components/settle/GroundingExercise'

export default function GroundPage() {
  return (
    <div className="min-h-screen bg-base p-6 flex flex-col items-center justify-center animate-[fadeIn_800ms_ease-out]">
      <GroundingExercise />
      <Link href="/settle" className="mt-8 text-ash hover:text-bone min-h-[44px] px-4 flex items-center gap-2 transition-settle">
        <ArrowLeft size={16} /> Back to Settle
      </Link>
    </div>
  )
}
