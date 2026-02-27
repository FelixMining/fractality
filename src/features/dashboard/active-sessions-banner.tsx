import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { Timer, Dumbbell, Play, Pause, Square, ArrowRight } from 'lucide-react'
import { useWorkoutStore } from '@/stores/workout.store'
import { db } from '@/lib/db/database'
import {
  loadTimerState,
  saveTimerState,
  type TimerState,
} from '@/features/sessions/work/work-timer'
import { formatDuration } from '@/lib/utils'

// ─── Hook : chronomètre de travail depuis localStorage ───────────────────────

function useWorkTimer() {
  const [state, setState] = useState<TimerState | null>(() => loadTimerState())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tick = () => {
      const s = loadTimerState()
      setState(s)
      if (!s) { setElapsed(0); return }
      if (s.isPaused) {
        setElapsed(Math.floor(s.elapsedSecs))
      } else {
        setElapsed(Math.floor(s.elapsedSecs + (Date.now() - s.activeStartedAt) / 1000))
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const pause = () => {
    const s = loadTimerState()
    if (!s || s.isPaused) return
    const updated: TimerState = {
      activeStartedAt: s.activeStartedAt,
      elapsedSecs: s.elapsedSecs + (Date.now() - s.activeStartedAt) / 1000,
      isPaused: true,
    }
    saveTimerState(updated)
    setState(updated)
    setElapsed(Math.floor(updated.elapsedSecs))
  }

  const resume = () => {
    const s = loadTimerState()
    if (!s || !s.isPaused) return
    const updated: TimerState = {
      activeStartedAt: Date.now(),
      elapsedSecs: s.elapsedSecs,
      isPaused: false,
    }
    saveTimerState(updated)
    setState(updated)
  }

  return { active: !!state, isPaused: state?.isPaused ?? false, elapsed, pause, resume }
}

// ─── Carte session de travail ─────────────────────────────────────────────────

function WorkTimerCard() {
  const navigate = useNavigate()
  const { isPaused, elapsed, pause, resume } = useWorkTimer()

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <Timer className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary uppercase tracking-wide">Session de travail en cours</p>
          <p className="text-2xl font-mono font-bold tabular-nums">{formatDuration(elapsed)}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isPaused ? (
          <Button size="sm" variant="outline" onClick={resume} className="gap-1.5">
            <Play className="size-3.5" />
            Reprendre
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={pause} className="gap-1.5">
            <Pause className="size-3.5" />
            Pause
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => navigate({ to: '/sessions/work' })}
          className="gap-1.5"
        >
          <Square className="size-3.5" />
          Arrêter
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate({ to: '/sessions/work' })}
        >
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Carte session de musculation ─────────────────────────────────────────────

function WorkoutSessionCard() {
  const navigate = useNavigate()
  const { activeSession, isPaused, exercises, pauseSession, resumeSession } = useWorkoutStore()

  const session = useLiveQuery(
    () => activeSession ? db.workout_sessions.get(activeSession.id) : undefined,
    [activeSession?.id],
  )

  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!session?.startedAt) return
    const startMs = new Date(session.startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.startedAt])

  const goToSession = () => {
    const templateId = session?.sessionTemplateId ?? activeSession?.id ?? 'active'
    navigate({ to: '/sessions/workout/live/$sessionTemplateId', params: { sessionTemplateId: templateId } })
  }

  const exerciseCount = exercises.length
  const seriesCount = exercises.reduce((acc, e) => acc + e.series.filter((s) => s.completed).length, 0)

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/20">
          <Dumbbell className="size-4 text-orange-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-orange-400 uppercase tracking-wide">Session de musculation en cours</p>
          <p className="text-2xl font-mono font-bold tabular-nums">{formatDuration(elapsed)}</p>
          {exerciseCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''} · {seriesCount} série{seriesCount > 1 ? 's' : ''} complétée{seriesCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isPaused ? (
          <Button size="sm" variant="outline" onClick={resumeSession} className="gap-1.5">
            <Play className="size-3.5" />
            Reprendre
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={pauseSession} className="gap-1.5">
            <Pause className="size-3.5" />
            Pause
          </Button>
        )}
        <Button size="sm" onClick={goToSession} className="gap-1.5">
          <ArrowRight className="size-3.5" />
          Accéder
        </Button>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ActiveSessionsBanner() {
  const activeWorkoutSession = useWorkoutStore((s) => s.activeSession)
  const [hasWorkTimer, setHasWorkTimer] = useState(() => !!loadTimerState())

  // Re-check le timer de travail toutes les secondes
  useEffect(() => {
    const id = setInterval(() => {
      setHasWorkTimer(!!loadTimerState())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  if (!hasWorkTimer && !activeWorkoutSession) return null

  return (
    <div className="flex flex-col gap-3">
      {hasWorkTimer && <WorkTimerCard />}
      {activeWorkoutSession && <WorkoutSessionCard />}
    </div>
  )
}
