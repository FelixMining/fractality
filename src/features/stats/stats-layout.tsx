import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatTab {
  to: string
  label: string
  disabled?: boolean
}

const STAT_TABS: StatTab[] = [
  { to: '/stats/work', label: 'Travail' },
  { to: '/stats/workout', label: 'Muscu' },
  { to: '/stats/cardio', label: 'Cardio' },
  { to: '/stats/stocks', label: 'Stocks' },
  { to: '/stats/recurring', label: 'Suivis' },
  { to: '/stats/events', label: 'Événements' },
  { to: '/stats/journal', label: 'Journal' },
  { to: '/stats/habits', label: 'Habitudes' },
]

interface StatsLayoutProps {
  children: ReactNode
}

export function StatsLayout({ children }: StatsLayoutProps) {
  const { pathname } = useLocation()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary mb-3">Statistiques</h1>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {STAT_TABS.map((tab) => {
            const isActive = pathname === tab.to
            if (tab.disabled) {
              return (
                <span
                  key={tab.to}
                  className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-text-muted border border-border opacity-50 cursor-not-allowed"
                  title="Bientôt disponible"
                >
                  {tab.label}
                </span>
              )
            }
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-violet-500 text-white'
                    : 'border border-border text-text-secondary hover:text-text-primary hover:border-violet-500/50',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
      {children}
    </div>
  )
}
