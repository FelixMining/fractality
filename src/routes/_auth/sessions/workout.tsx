import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { Play, FolderKanban, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const WORKOUT_TABS = [
  { to: '/sessions/workout', label: 'Séances', icon: Play, matchPrefix: null },
  { to: '/sessions/workout/programs', label: 'Programmes', icon: FolderKanban, matchPrefix: '/sessions/workout/programs' },
  { to: '/sessions/workout/exercises', label: 'Exercices', icon: BookOpen, matchPrefix: '/sessions/workout/exercises' },
] as const

function WorkoutLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-border">
        {WORKOUT_TABS.map((tab) => {
          const isActive = tab.matchPrefix
            ? pathname.startsWith(tab.matchPrefix)
            : pathname === '/sessions/workout' || pathname === '/sessions/workout/'
          const Icon = tab.icon

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex flex-1 min-h-[44px] items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-sm transition-colors',
                isActive
                  ? 'border-[var(--color-sessions)] text-[var(--color-sessions)] font-medium'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              <Icon size={15} />
              {tab.label}
            </Link>
          )
        })}
      </div>
      <Outlet />
    </div>
  )
}

export const Route = createFileRoute('/_auth/sessions/workout')({
  component: WorkoutLayout,
})
