import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { TimerDisplay } from '@/components/shared/timer-display'
import { Play, Pause, Square } from 'lucide-react'

export const WORK_TIMER_STORAGE_KEY = 'fractality_active_work_timer'

interface TimerState {
  activeStartedAt: number // Date.now() quand la période de run actuelle a démarré
  elapsedSecs: number     // secondes accumulées des périodes précédentes
  isPaused: boolean
}

function saveTimerState(state: TimerState) {
  localStorage.setItem(WORK_TIMER_STORAGE_KEY, JSON.stringify(state))
}

function clearTimerState() {
  localStorage.removeItem(WORK_TIMER_STORAGE_KEY)
}

export function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(WORK_TIMER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TimerState
  } catch {
    return null
  }
}

function computeElapsed(state: TimerState): number {
  if (state.isPaused) return state.elapsedSecs
  return state.elapsedSecs + (Date.now() - state.activeStartedAt) / 1000
}

interface WorkTimerProps {
  onStop: (duration: number) => void
}

export function WorkTimer({ onStop }: WorkTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerStateRef = useRef<TimerState | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Restaurer depuis localStorage au montage
  useEffect(() => {
    const saved = loadTimerState()
    if (saved) {
      timerStateRef.current = saved
      setElapsedTime(Math.floor(computeElapsed(saved)))
      setIsRunning(true)
      setIsPaused(saved.isPaused)
    }
  }, [])

  // Tick toutes les secondes
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        if (timerStateRef.current) {
          setElapsedTime(Math.floor(computeElapsed(timerStateRef.current)))
        }
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isPaused])

  const handleStart = useCallback(() => {
    const state: TimerState = {
      activeStartedAt: Date.now(),
      elapsedSecs: 0,
      isPaused: false,
    }
    timerStateRef.current = state
    saveTimerState(state)
    setElapsedTime(0)
    setIsRunning(true)
    setIsPaused(false)
  }, [])

  const handlePause = useCallback(() => {
    if (!timerStateRef.current) return
    const state: TimerState = {
      activeStartedAt: timerStateRef.current.activeStartedAt,
      elapsedSecs: computeElapsed(timerStateRef.current),
      isPaused: true,
    }
    timerStateRef.current = state
    saveTimerState(state)
    setIsPaused(true)
  }, [])

  const handleResume = useCallback(() => {
    if (!timerStateRef.current) return
    const state: TimerState = {
      activeStartedAt: Date.now(),
      elapsedSecs: timerStateRef.current.elapsedSecs,
      isPaused: false,
    }
    timerStateRef.current = state
    saveTimerState(state)
    setIsPaused(false)
  }, [])

  const handleStop = useCallback(() => {
    const elapsed = timerStateRef.current
      ? Math.floor(computeElapsed(timerStateRef.current))
      : elapsedTime

    clearTimerState()
    timerStateRef.current = null
    setIsRunning(false)
    setIsPaused(false)
    setElapsedTime(0)

    if (elapsed < 1) return
    onStop(elapsed)
  }, [elapsedTime, onStop])

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg border bg-card p-8">
      <TimerDisplay elapsedTime={elapsedTime} />

      <div className="flex gap-3">
        {!isRunning && (
          <Button onClick={handleStart} size="lg" className="gap-2">
            <Play className="size-5" />
            Démarrer
          </Button>
        )}

        {isRunning && !isPaused && (
          <Button onClick={handlePause} size="lg" variant="secondary" className="gap-2">
            <Pause className="size-5" />
            Pause
          </Button>
        )}

        {isRunning && isPaused && (
          <Button onClick={handleResume} size="lg" className="animate-pulse gap-2">
            <Play className="size-5" />
            Reprendre
          </Button>
        )}

        {isRunning && (
          <Button onClick={handleStop} size="lg" variant="destructive" className="gap-2">
            <Square className="size-5" />
            Stop
          </Button>
        )}
      </div>

      {isPaused && (
        <p className="text-sm text-muted-foreground">Chronomètre en pause</p>
      )}
    </div>
  )
}
