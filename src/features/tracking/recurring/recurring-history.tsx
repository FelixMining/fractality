import { useLiveQuery } from 'dexie-react-hooks'
import {
  trackingResponseRepository,
  getScheduledDates,
} from '@/lib/db/repositories/tracking.repository'
import { toLocalDateString } from '@/lib/utils'
import { RecurringResponse } from './recurring-response'
import { Skeleton } from '@/components/ui/skeleton'
import type { TrackingRecurring } from '@/schemas/tracking-recurring.schema'

const HISTORY_DAYS = 7

interface RecurringHistoryProps {
  recurring: TrackingRecurring
}

export function RecurringHistory({ recurring }: RecurringHistoryProps) {
  const today = toLocalDateString()

  // Période : des 7 derniers jours jusqu'à hier (exclu aujourd'hui)
  const sevenDaysAgoDate = new Date()
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - HISTORY_DAYS)
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)

  const sevenDaysAgo = toLocalDateString(sevenDaysAgoDate)

  // Dates planifiées dans la période
  const scheduledDates = getScheduledDates(recurring, sevenDaysAgoDate, yesterdayDate)

  // Réponses existantes dans la période
  const responses = useLiveQuery(
    () => trackingResponseRepository.getInDateRange(sevenDaysAgo, today),
    [sevenDaysAgo, today],
  )

  if (responses === undefined) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    )
  }

  if (scheduledDates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Aucune date planifiée dans les {HISTORY_DAYS} derniers jours.
      </p>
    )
  }

  // Map date → réponse pour ce suivi uniquement
  const responseByDate = new Map(
    responses
      .filter((r) => r.recurringId === recurring.id)
      .map((r) => [r.date, r]),
  )

  return (
    <div className="space-y-4">
      {scheduledDates.map((date) => {
        const existing = responseByDate.get(date)
        const label = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })

        return (
          <div key={date} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium capitalize">{label}</p>
              {existing && (
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: '#8B5CF6' }}
                  aria-label="Rempli"
                />
              )}
            </div>
            <RecurringResponse
              recurring={recurring}
              existingResponse={existing}
              date={date}
            />
          </div>
        )
      })}
    </div>
  )
}
