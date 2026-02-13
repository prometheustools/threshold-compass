'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Compass, Pill, FlaskConical, Layers, Clock, Wind, BarChart3, Calculator } from 'lucide-react'
import OfflineBanner from '@/components/ui/OfflineBanner'

const navItems = [
  { href: '/compass', label: 'Compass', icon: Compass },
  { href: '/log', label: 'Log', icon: Pill },
  { href: '/calculator', label: 'Calc', icon: Calculator },
  { href: '/discovery', label: 'Discovery', icon: FlaskConical },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/batch', label: 'Batches', icon: Layers },
  { href: '/history', label: 'History', icon: Clock },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSettlePage = pathname.startsWith('/settle')

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <OfflineBanner />
      <main className="flex-1 pb-20">{children}</main>

      {/* Settle Mode sticky button — always visible unless already in settle */}
      {!isSettlePage && (
        <Link
          href="/settle"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange text-base shadow-lg transition-settle hover:brightness-110 active:scale-95"
          aria-label="Settle Mode"
        >
          <Wind size={24} />
        </Link>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-ember/20 bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center justify-around">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-[56px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 transition-quick ${
                  isActive ? 'text-orange' : 'text-ash hover:text-bone'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} />
                <span className="font-mono text-[10px] tracking-wider uppercase">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
