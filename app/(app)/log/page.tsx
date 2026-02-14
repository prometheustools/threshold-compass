'use client'

import { Pill } from 'lucide-react'
import Link from 'next/link'
import DoseForm from '@/components/forms/DoseForm'

export default function LogPage() {
  return (
    <div className="min-h-screen bg-base text-ivory">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-base/95 backdrop-blur-md border-b border-ember/10">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center">
              <Pill className="w-5 h-5 text-orange" />
            </div>
            <div>
              <p className="font-mono text-xs tracking-wider uppercase text-bone">Dose Logging</p>
              <h1 className="text-xl font-semibold">Log Your Dose</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-xl mx-auto">
          <div className="mb-4 flex justify-end">
            <Link
              href="/log/complete"
              className="rounded-button border border-ember/30 bg-elevated px-3 py-2 font-mono text-[10px] tracking-widest uppercase text-bone transition-settle hover:border-ember/60 hover:text-ivory"
            >
              Complete Previous Dose
            </Link>
          </div>
          <DoseForm />
        </div>
      </main>
    </div>
  )
}
