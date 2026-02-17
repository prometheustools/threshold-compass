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
          href="/drift"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange text-base shadow-lg transition-settle hover:brightness-110 active:scale-95"
          aria-label="Settle Mode"
        >
          <Wind size={24} />
        </Link>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-ember/20 bg-base/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-around px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex min-h-[56px] min-w-[56px] flex-col items-center justify-center gap-1 px-3 py-2 transition-all duration-300 ${
                  isActive 
                    ? 'text-orange' 
                    : 'text-ash hover:text-bone'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange rounded-full" />
                )}
                
                {/* Icon container with hover/active background */}
                <span className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-orange/10' 
                    : 'group-hover:bg-elevated/50'
                }`}>
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}
                  />
                </span>
                
                {/* Label */}
                <span className={`font-mono text-[10px] tracking-wider uppercase transition-all duration-300 ${
                  isActive ? 'font-semibold' : ''
                }`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
        {/* Safe area spacer for iOS */}
        <div className="h-safe-area-inset-bottom bg-base" />
      </nav>
    </div>
  )
}
