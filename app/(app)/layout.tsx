'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Compass, PenLine, Clock, Settings, Wind } from 'lucide-react'
import OfflineBanner from '@/components/ui/OfflineBanner'

const navItems = [
  { href: '/compass', label: 'Compass', icon: Compass },
  { href: '/log', label: 'Log', icon: PenLine },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSettlePage = pathname.startsWith('/settle')

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <OfflineBanner />
      <main className="flex-1 pb-20">{children}</main>

      {!isSettlePage && (
        <Link
          href="/settle"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange text-base shadow-lg transition-settle hover:brightness-110 active:scale-95"
          aria-label="Settle Mode"
        >
          <Wind size={24} />
        </Link>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-ember/20 bg-base backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center justify-around">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 transition-settle ${
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
