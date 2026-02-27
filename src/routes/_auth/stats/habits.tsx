import { createFileRoute } from '@tanstack/react-router'
import { HabitsStats } from '@/features/stats/habits-stats'

export const Route = createFileRoute('/_auth/stats/habits')({
  component: HabitsStats,
})
