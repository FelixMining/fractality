import { useEffect, useState } from 'react'
import { CardioSessionList, countCardioFilters } from './cardio-session-list'
import type { CardioFilters } from './cardio-session-list'
import { CardioSessionForm } from './cardio-session-form'
import { CardioSessionDetail } from './cardio-session-detail'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/shared/form-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FilterBar } from '@/components/shared/filter-bar'
import { ProjectPicker } from '@/components/shared/project-picker'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useUndo } from '@/hooks/use-undo'
import { cardioSessionRepository } from '@/lib/db/repositories/cardio-session.repository'
import { consumeCreate } from '@/lib/create-signal'
import type { CardioSession, CardioActivityType } from '@/schemas/cardio-session.schema'
import { Plus } from 'lucide-react'

const ACTIVITY_TYPE_LABELS: Record<CardioActivityType, string> = {
  running: 'Course',
  cycling: 'Vélo',
  swimming: 'Natation',
  hiking: 'Randonnée',
  walking: 'Marche',
  other: 'Autre',
}

const EMPTY_CARDIO_FILTERS: CardioFilters = {
  projectId: null,
  from: '',
  to: '',
  activityTypes: [],
}

type ViewMode = 'list' | 'form' | 'detail'

export function CardioSessionPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingSessionData, setEditingSessionData] = useState<CardioSession | null>(null)
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [filters, setFilters] = useState<CardioFilters>(EMPTY_CARDIO_FILTERS)

  const { withUndo } = useUndo()

  // Ouvrir le formulaire de création si signalé par le bouton +
  useEffect(() => {
    if (consumeCreate()) handleCreateNew()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateNew = () => {
    setEditingSessionData(null)
    setViewMode('form')
  }

  const handleEdit = async (sessionId: string) => {
    const session = await cardioSessionRepository.getById(sessionId)
    if (session) {
      setEditingSessionData(session)
      setViewMode('form')
    }
  }

  const handleView = (sessionId: string) => {
    setViewingSessionId(sessionId)
    setViewMode('detail')
  }

  const handleDeleteRequest = (sessionId: string) => {
    setDeletingSessionId(sessionId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSessionId) return

    const session = await cardioSessionRepository.getById(deletingSessionId)
    if (!session) return

    await withUndo(
      `Session "${session.title}" supprimée`,
      async () => {
        await cardioSessionRepository.softDelete(deletingSessionId)
      },
      async () => {
        await cardioSessionRepository.restore(deletingSessionId)
      },
    )

    setDeleteDialogOpen(false)
    setDeletingSessionId(null)

    if (viewMode === 'detail') {
      setViewMode('list')
    }
  }

  const handleFormSuccess = () => {
    setViewMode('list')
    setEditingSessionData(null)
  }

  const handleFormCancel = () => {
    setViewMode('list')
    setEditingSessionData(null)
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cardio</h1>
          <p className="text-muted-foreground">
            Importez un GPX ou saisissez vos sessions cardio
          </p>
        </div>
        {viewMode === 'list' && (
          <Button onClick={handleCreateNew} size="lg" className="gap-2">
            <Plus className="size-5" />
            Nouvelle session
          </Button>
        )}
      </div>

      {/* FilterBar — visible en mode liste uniquement */}
      {viewMode === 'list' && (
        <FilterBar
          activeCount={countCardioFilters(filters)}
          onReset={() => setFilters(EMPTY_CARDIO_FILTERS)}
        >
          <ProjectPicker
            value={filters.projectId}
            onChange={(id) => setFilters((f) => ({ ...f, projectId: id }))}
            placeholder="Tous les projets"
          />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Période</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="cardio-filter-from" className="text-xs">Du</Label>
                <Input
                  id="cardio-filter-from"
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cardio-filter-to" className="text-xs">Au</Label>
                <Input
                  id="cardio-filter-to"
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACTIVITY_TYPE_LABELS) as CardioActivityType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    const updated = filters.activityTypes.includes(type)
                      ? filters.activityTypes.filter((t) => t !== type)
                      : [...filters.activityTypes, type]
                    setFilters((f) => ({ ...f, activityTypes: updated }))
                  }}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    filters.activityTypes.includes(type)
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : 'border-border bg-transparent text-muted-foreground'
                  }`}
                >
                  {ACTIVITY_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </FilterBar>
      )}

      {/* Content */}
      {viewMode === 'list' && (
        <CardioSessionList
          filters={filters}
          onView={handleView}
          onDelete={handleDeleteRequest}
        />
      )}

      {viewMode === 'detail' && viewingSessionId && (
        <CardioSessionDetail
          sessionId={viewingSessionId}
          onEdit={() => handleEdit(viewingSessionId)}
          onDelete={() => handleDeleteRequest(viewingSessionId)}
          onBack={() => setViewMode('list')}
        />
      )}

      {/* Formulaire — plein écran */}
      <FormModal
        open={viewMode === 'form'}
        onClose={handleFormCancel}
        title={editingSessionData ? 'Modifier la session' : 'Nouvelle session cardio'}
      >
        <CardioSessionForm
          initialData={editingSessionData || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </FormModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer cette session ?"
        description="Cette session sera déplacée dans la corbeille. Vous pourrez la restaurer depuis la corbeille."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
