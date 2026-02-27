import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/database'
import { EmptyState } from '@/components/shared/empty-state'
import { ActiveSessionsBanner } from './active-sessions-banner'
import { TodaySummary } from './today-summary'
import { StockAlerts } from './stock-alerts'
import { WeekStats } from './week-stats'
import { StreakDisplay } from './streak-display'
import { ActivityFeed } from './activity-feed'

export function DashboardPage() {
  const hasAnyData = useLiveQuery(async () => {
    const counts = await Promise.all([
      db.work_sessions.filter((s) => !s.isDeleted).count(),
      db.workout_sessions.filter((s) => !s.isDeleted).count(),
      db.cardio_sessions.filter((s) => !s.isDeleted).count(),
      db.tracking_events.filter((e) => !e.isDeleted).count(),
      db.journal_entries.filter((e) => !e.isDeleted).count(),
      db.tracking_recurrings.filter((r) => !r.isDeleted).count(),
    ])
    return counts.some((c) => c > 0)
  }, [])

  // Skeleton pendant le chargement initial
  if (hasAnyData === undefined) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <div className="h-32 animate-pulse rounded-xl bg-card" />
        <div className="h-48 animate-pulse rounded-xl bg-card" />
      </div>
    )
  }

  if (!hasAnyData) {
    return (
      <EmptyState
        title="Bienvenue sur Fractality !"
        subtitle="Commencez par ajouter votre première entrée. Utilisez le bouton + ci-dessous."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <ActiveSessionsBanner />
      <TodaySummary />
      <StockAlerts />
      <WeekStats />
      <StreakDisplay />
      <ActivityFeed />
    </div>
  )
}
