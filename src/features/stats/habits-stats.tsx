import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { cn, toLocalDateString } from '@/lib/utils'
import { db } from '@/lib/db/database'
import { StatsLayout } from '@/features/stats/stats-layout'
import { EmptyState } from '@/components/shared/empty-state'
import { StreakIndicator } from '@/components/shared/streak-indicator'
import { StatCard } from '@/components/shared/stat-card'
import { calculateStreak, getLast7Days } from '@/features/dashboard/streak-display'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PilierFilter = 'global' | 'sessions' | 'stocks' | 'tracking'

// ---------------------------------------------------------------------------
// Fonctions pures exportées (testables)
// ---------------------------------------------------------------------------

/** Construit une Map date YYYY-MM-DD → nombre d'entrées */
export function buildDayCountMap(dates: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const date of dates) {
    map.set(date, (map.get(date) ?? 0) + 1)
  }
  return map
}

/** Retourne le niveau d'intensité 0-4 pour une cellule */
export function getIntensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 10) return 3
  return 4
}

/** Retourne le meilleur streak historique en jours consécutifs */
export function getBestStreak(dayCountMap: Map<string, number>): number {
  if (dayCountMap.size === 0) return 0
  const activeDates = [...dayCountMap.keys()]
    .filter((d) => (dayCountMap.get(d) ?? 0) > 0)
    .sort()
  if (activeDates.length === 0) return 0
  let best = 1
  let current = 1
  for (let i = 1; i < activeDates.length; i++) {
    const prev = new Date(activeDates[i - 1] + 'T12:00:00')
    prev.setDate(prev.getDate() + 1)
    if (toLocalDateString(prev) === activeDates[i]) {
      current++
      best = Math.max(best, current)
    } else {
      current = 1
    }
  }
  return best
}

/** Retourne la moyenne d'entrées par jour actif (arrondi 1 décimale) */
export function calcAvgEntriesPerDay(dayCountMap: Map<string, number>): number {
  const activeDays = [...dayCountMap.values()].filter((c) => c > 0)
  if (activeDays.length === 0) return 0
  const total = activeDays.reduce((sum, c) => sum + c, 0)
  return Math.round((total / activeDays.length) * 10) / 10
}

/**
 * Génère la liste des dates pour la grille (du lundi de la semaine de J-364
 * au dimanche de la semaine courante). Longueur toujours multiple de 7.
 */
export function buildGridDays(today: string, numDays = 365): string[] {
  // Début : J - (numDays - 1) puis reculer au lundi de cette semaine
  const firstDay = new Date(today + 'T12:00:00')
  firstDay.setDate(firstDay.getDate() - (numDays - 1))
  const dow = firstDay.getDay() // 0 = dim
  firstDay.setDate(firstDay.getDate() - ((dow + 6) % 7))

  // Fin : dimanche de la semaine de today
  const lastDay = new Date(today + 'T12:00:00')
  const dowEnd = lastDay.getDay()
  lastDay.setDate(lastDay.getDate() + (dowEnd === 0 ? 0 : 7 - dowEnd))

  const days: string[] = []
  const cur = new Date(firstDay)
  while (cur <= lastDay) {
    days.push(toLocalDateString(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

// ---------------------------------------------------------------------------
// Couleurs inline (Tailwind v4 — pas de classes dynamiques)
// ---------------------------------------------------------------------------

const PILIER_BASE_COLORS: Record<PilierFilter, [number, number, number]> = {
  global: [139, 92, 246], // #8B5CF6 violet
  sessions: [59, 130, 246], // #3B82F6 bleu
  stocks: [16, 185, 129], // #10B981 vert
  tracking: [139, 92, 246], // #8B5CF6 violet
}
const OPACITY_BY_LEVEL = [0, 0.25, 0.5, 0.75, 1.0] as const

export function getCellColor(count: number, pilier: PilierFilter): string {
  const level = getIntensityLevel(count)
  if (level === 0) return 'transparent'
  const [r, g, b] = PILIER_BASE_COLORS[pilier]
  return `rgba(${r}, ${g}, ${b}, ${OPACITY_BY_LEVEL[level]})`
}

// ---------------------------------------------------------------------------
// Requêtes Dexie par pilier
// ---------------------------------------------------------------------------

async function collectGlobalDates(): Promise<string[]> {
  const [workSessions, workoutSessions, cardioSessions, events, journal, responses] =
    await Promise.all([
      db.work_sessions.filter((s) => !s.isDeleted).toArray(),
      db.workout_sessions.filter((s) => !s.isDeleted && s.status === 'completed').toArray(),
      db.cardio_sessions.filter((s) => !s.isDeleted).toArray(),
      db.tracking_events.filter((e) => !e.isDeleted).toArray(),
      db.journal_entries.filter((e) => !e.isDeleted).toArray(),
      db.tracking_responses.filter((r) => !r.isDeleted).toArray(),
    ])
  const dates: string[] = []
  workSessions.forEach((s) => dates.push(toLocalDateString(new Date(s.date))))
  workoutSessions.forEach((s) => dates.push(toLocalDateString(new Date(s.startedAt))))
  cardioSessions.forEach((s) => dates.push(toLocalDateString(new Date(s.date))))
  events.forEach((e) => dates.push(e.eventDate.substring(0, 10)))
  journal.forEach((e) => dates.push(e.entryDate.substring(0, 10)))
  responses.forEach((r) => dates.push(r.date))
  return dates
}

async function collectSessionsDates(): Promise<string[]> {
  const [workSessions, workoutSessions, cardioSessions] = await Promise.all([
    db.work_sessions.filter((s) => !s.isDeleted).toArray(),
    db.workout_sessions.filter((s) => !s.isDeleted && s.status === 'completed').toArray(),
    db.cardio_sessions.filter((s) => !s.isDeleted).toArray(),
  ])
  const dates: string[] = []
  workSessions.forEach((s) => dates.push(toLocalDateString(new Date(s.date))))
  workoutSessions.forEach((s) => dates.push(toLocalDateString(new Date(s.startedAt))))
  cardioSessions.forEach((s) => dates.push(toLocalDateString(new Date(s.date))))
  return dates
}

async function collectStocksDates(): Promise<string[]> {
  const purchases = await db.stock_purchases.filter((p) => !p.isDeleted).toArray()
  return purchases.map((p) => p.date)
}

async function collectTrackingDates(): Promise<string[]> {
  const [events, journal, responses] = await Promise.all([
    db.tracking_events.filter((e) => !e.isDeleted).toArray(),
    db.journal_entries.filter((e) => !e.isDeleted).toArray(),
    db.tracking_responses.filter((r) => !r.isDeleted).toArray(),
  ])
  const dates: string[] = []
  events.forEach((e) => dates.push(e.eventDate.substring(0, 10)))
  journal.forEach((e) => dates.push(e.entryDate.substring(0, 10)))
  responses.forEach((r) => dates.push(r.date))
  return dates
}

// ---------------------------------------------------------------------------
// Sélecteur de pilier
// ---------------------------------------------------------------------------

const PILIER_OPTIONS: { key: PilierFilter; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'tracking', label: 'Tracking' },
]

// ---------------------------------------------------------------------------
// Composant HabitCalendar (inline — pas de fichier séparé)
// ---------------------------------------------------------------------------

interface HabitCalendarProps {
  gridDays: string[]
  dayCountMap: Map<string, number>
  today: string
  pilier: PilierFilter
}

function HabitCalendar({ gridDays, dayCountMap, today, pilier }: HabitCalendarProps) {
  // Début de la période : J-364 (les jours de padding avant cette date sont hors période)
  const periodStart = (() => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - 364)
    return toLocalDateString(d)
  })()

  return (
    <div className="overflow-x-auto" role="img" aria-label="Calendrier d'activité — 365 derniers jours">
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: 'repeat(7, 12px)',
          minWidth: 'max-content',
        }}
      >
        {gridDays.map((date) => {
          const count = dayCountMap.get(date) ?? 0
          const isToday = date === today
          const isFuture = date > today
          // Jours de padding avant la période (lundi de début de semaine < J-364)
          const isOutOfRange = date < periodStart
          const isVisible = !isFuture && !isOutOfRange
          const color = isVisible ? getCellColor(count, pilier) : 'transparent'
          const tooltipDate = new Intl.DateTimeFormat('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }).format(new Date(date + 'T12:00:00'))
          const tooltipText = !isVisible
            ? ''
            : count === 0
              ? `${tooltipDate} — Aucune entrée`
              : `${tooltipDate} — ${count} entrée${count > 1 ? 's' : ''}`
          return (
            <div
              key={date}
              title={tooltipText}
              className={cn(
                'h-3 w-3 rounded-[2px]',
                isVisible && count === 0 && 'bg-muted',
                isToday && 'ring-1 ring-violet-400',
              )}
              style={!isVisible ? {} : count > 0 ? { backgroundColor: color } : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal HabitsStats
// ---------------------------------------------------------------------------

export function HabitsStats() {
  const today = toLocalDateString()
  const navigate = useNavigate()
  const [selectedPilier, setSelectedPilier] = useState<PilierFilter>('global')

  const allDates = useLiveQuery(async () => {
    if (selectedPilier === 'sessions') return collectSessionsDates()
    if (selectedPilier === 'stocks') return collectStocksDates()
    if (selectedPilier === 'tracking') return collectTrackingDates()
    return collectGlobalDates()
  }, [selectedPilier])

  const dayCountMap = useMemo(
    () => buildDayCountMap(allDates ?? []),
    [allDates],
  )

  const gridDays = useMemo(() => buildGridDays(today), [today])

  const activeDatesSet = useMemo(
    () => new Set([...dayCountMap.keys()].filter((d) => (dayCountMap.get(d) ?? 0) > 0)),
    [dayCountMap],
  )

  const streakCount = useMemo(() => calculateStreak(activeDatesSet, today), [activeDatesSet, today])
  const last7Days = useMemo(
    () => getLast7Days(today).map((date) => ({ date, hasActivity: activeDatesSet.has(date) })),
    [today, activeDatesSet],
  )
  const bestStreak = useMemo(() => getBestStreak(dayCountMap), [dayCountMap])
  const totalActiveDays = activeDatesSet.size
  const avgPerDay = useMemo(() => calcAvgEntriesPerDay(dayCountMap), [dayCountMap])

  // État de chargement
  if (allDates === undefined) {
    return (
      <StatsLayout>
        <div className="space-y-4">
          <div className="h-8 animate-pulse rounded-lg bg-card" />
          <div className="h-48 animate-pulse rounded-xl bg-card" />
        </div>
      </StatsLayout>
    )
  }

  // État vide
  if (allDates.length === 0) {
    return (
      <StatsLayout>
        <EmptyState
          title="Aucune activité enregistrée"
          subtitle="Commencez à enregistrer des sessions, stocks ou suivis pour voir vos habitudes ici."
          ctaLabel="Commencer à tracker"
          ctaAction={() => void navigate({ to: '/dashboard' })}
        />
      </StatsLayout>
    )
  }

  return (
    <StatsLayout>
      <div className="space-y-5">
        {/* Sélecteur pilier */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {PILIER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedPilier(key)}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                selectedPilier === key
                  ? 'bg-violet-500 text-white'
                  : 'border border-border text-text-secondary hover:text-text-primary',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grille calendrier */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Activité — 365 derniers jours
          </h2>
          <HabitCalendar
            gridDays={gridDays}
            dayCountMap={dayCountMap}
            today={today}
            pilier={selectedPilier}
          />
          {/* Légende */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Moins</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn('h-3 w-3 rounded-[2px]', level === 0 && 'bg-muted')}
                style={
                  level > 0
                    ? {
                        backgroundColor: getCellColor(
                          [0, 1, 3, 6, 11][level],
                          selectedPilier,
                        ),
                      }
                    : undefined
                }
              />
            ))}
            <span>Plus</span>
          </div>
        </div>

        {/* Streak */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Régularité
          </h2>
          <StreakIndicator days={last7Days} streakCount={streakCount} today={today} />
        </div>

        {/* Métriques */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Meilleur streak" value={bestStreak} unit="jours" />
          <StatCard label="Jours actifs" value={totalActiveDays} />
          <StatCard label="Moy./jour actif" value={avgPerDay} />
        </div>
      </div>
    </StatsLayout>
  )
}
