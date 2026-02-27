import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { WorkTimer, loadTimerState } from './work-timer'
import { WorkSessionList, countWorkFilters } from './work-session-list'
import type { WorkFilters } from './work-session-list'
import { WorkSessionForm } from './work-session-form'
import { WorkSessionDetail } from './work-session-detail'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/shared/form-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FilterBar } from '@/components/shared/filter-bar'
import { ProjectPicker } from '@/components/shared/project-picker'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useUndo } from '@/hooks/use-undo'
import { workSessionRepository } from '@/lib/db/repositories/work-session.repository'
import { useCreateOnMount } from '@/hooks/use-create-on-mount'
import type { WorkSession } from '@/schemas/work-session.schema'
import { Timer, Plus } from 'lucide-react'
import { toast } from 'sonner'

const EMPTY_WORK_FILTERS: WorkFilters = {
  projectId: null,
  from: '',
  to: '',
}

type ViewMode = 'list' | 'timer' | 'form' | 'detail'
type FormMode = 'timer' | 'manual'

export function WorkSessionPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showTimer, setShowTimer] = useState(false)
  const [filters, setFilters] = useState<WorkFilters>(EMPTY_WORK_FILTERS)
  const [formMode, setFormMode] = useState<FormMode>('timer')
  const [sessionFormDuration, setSessionFormDuration] = useState<number | undefined>()
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionData, setEditingSessionData] = useState<WorkSession | null>(null)
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  const { withUndo } = useUndo()

  // Écouter les sessions actives depuis Dexie (cross-device)
  const activeWorkSession = useLiveQuery(
    () => workSessionRepository.getActiveSession(),
    []
  )

  // Afficher le timer si session active en Dexie OU dans localStorage
  useEffect(() => {
    if (activeWorkSession || loadTimerState()) {
      setShowTimer(true)
    }
  }, [activeWorkSession])

  // Ouvrir le formulaire de création si signalé par le bouton +
  useCreateOnMount(handleCreateNew)

  const handleStartTimer = () => {
    setShowTimer(true)
  }

  const handleStopTimer = async (sessionId: string) => {
    setShowTimer(false)
    const session = await workSessionRepository.getById(sessionId)
    if (!session) return
    setEditingSessionData(session)
    setSessionFormDuration(session.duration)
    setFormMode('timer')
    setViewMode('form')
  }

  function handleCreateNew() {
    setSessionFormDuration(undefined)
    setEditingSessionId(null)
    setEditingSessionData(null)
    setFormMode('manual')
    setViewMode('form')
  }

  const handleEdit = async (sessionId: string) => {
    const session = await workSessionRepository.getById(sessionId)
    if (session) {
      setEditingSessionId(sessionId)
      setEditingSessionData(session)
      setSessionFormDuration(undefined)
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

    try {
      const session = await workSessionRepository.getById(deletingSessionId)
      if (!session) return

      await withUndo(
        `Session "${session.title}" supprimée`,
        async () => {
          await workSessionRepository.softDelete(deletingSessionId)
        },
        async () => {
          await workSessionRepository.restore(deletingSessionId)
        }
      )

      setDeleteDialogOpen(false)
      setDeletingSessionId(null)

      if (viewMode === 'detail') {
        setViewMode('list')
      }
    } catch (err) {
      console.error('Erreur suppression session:', err)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleFormSuccess = () => {
    setViewMode('list')
    setEditingSessionId(null)
    setEditingSessionData(null)
    setSessionFormDuration(undefined)
  }

  const handleFormCancel = () => {
    setViewMode('list')
    setEditingSessionId(null)
    setEditingSessionData(null)
    setSessionFormDuration(undefined)
  }

  return (
    <div className="flex flex-col gap-4 overflow-x-hidden">
      {/* Boutons d'action — visibles uniquement en mode liste sans timer */}
      {!showTimer && viewMode === 'list' && (
        <div className="flex justify-center gap-3 px-4">
          <Button onClick={handleStartTimer} className="gap-2">
            <Timer className="size-4" />
            Chronomètre
          </Button>
          <Button onClick={handleCreateNew} variant="outline" className="gap-2">
            <Plus className="size-4" />
            Nouvelle
          </Button>
        </div>
      )}

      {/* Timer */}
      {showTimer && (
        <div className="py-4">
          <WorkTimer
            existingSession={activeWorkSession ?? undefined}
            onStop={handleStopTimer}
          />
        </div>
      )}

      {/* FilterBar — visible en mode liste sans timer */}
      {viewMode === 'list' && !showTimer && (
        <div className="px-4">
          <FilterBar
            activeCount={countWorkFilters(filters)}
            onReset={() => setFilters(EMPTY_WORK_FILTERS)}
          >
            <ProjectPicker
              value={filters.projectId}
              onChange={(id) => setFilters((f) => ({ ...f, projectId: id }))}
              placeholder="Tous les projets"
            />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Période</Label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <Label htmlFor="work-filter-from" className="text-xs">Du</Label>
                  <Input
                    id="work-filter-from"
                    type="date"
                    className="w-full"
                    value={filters.from}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <Label htmlFor="work-filter-to" className="text-xs">Au</Label>
                  <Input
                    id="work-filter-to"
                    type="date"
                    className="w-full"
                    value={filters.to}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </FilterBar>
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' && !showTimer && (
        <WorkSessionList
          filters={filters}
          onEdit={handleView}
          onDelete={handleDeleteRequest}
        />
      )}

      {viewMode === 'detail' && viewingSessionId && (
        <WorkSessionDetail
          sessionId={viewingSessionId}
          onEdit={() => handleEdit(viewingSessionId)}
          onDelete={() => handleDeleteRequest(viewingSessionId)}
        />
      )}

      {/* Formulaire — plein écran */}
      <FormModal
        open={viewMode === 'form'}
        onClose={handleFormCancel}
        title={editingSessionId ? 'Modifier la session' : 'Nouvelle session de travail'}
      >
        <WorkSessionForm
          mode={formMode}
          initialDuration={sessionFormDuration}
          initialData={editingSessionData ?? undefined}
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
