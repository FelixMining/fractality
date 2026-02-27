import { Link, useLocation } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabDef {
  to: string
  label: string
  icon: LucideIcon
}

interface PillarTabsProps {
  tabs: TabDef[]
  color: string
}

export function PillarTabs({ tabs, color }: PillarTabsProps) {
  const { pathname } = useLocation()
  const cssColor = `var(--color-${color})`

  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = pathname === tab.to

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'flex flex-1 min-h-[44px] items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-sm transition-colors',
              isActive
                ? 'font-medium'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
            style={
              isActive
                ? { borderBottomColor: cssColor, color: cssColor }
                : undefined
            }
          >
            <Icon size={15} />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
