'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import WhatIsHappening from '@/components/settle/WhatIsHappening'
import whatIsHappening from '@/content/what-is-happening.json'
import type { WhatIsHappeningCard } from '@/types'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-base p-6 animate-[fadeIn_800ms_ease-out]">
      <div className="max-w-xl mx-auto">
        <WhatIsHappening cards={whatIsHappening as WhatIsHappeningCard[]} />
        <div className="flex justify-center mt-8">
          <Link href="/settle" className="text-ash hover:text-bone min-h-[44px] px-4 flex items-center gap-2 transition-settle">
            <ArrowLeft size={16} /> Back to Settle
          </Link>
        </div>
      </div>
    </div>
  )
}
