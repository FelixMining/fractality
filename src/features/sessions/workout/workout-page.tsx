import { Link, useNavigate } from '@tanstack/react-router'
import { History } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'

export function WorkoutPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="sr-only">Sessions de musculation</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/sessions/workout/history">
            <History className="h-4 w-4 mr-2" aria-hidden="true" />
            Historique
          </Link>
        </Button>
      </div>
      <EmptyState
        title="Aucune séance de musculation"
        subtitle="Créez un programme pour commencer."
        ctaLabel="Créer un programme"
        ctaAction={() => void navigate({ to: '/sessions/workout/programs' })}
      />
    </div>
  )
}
