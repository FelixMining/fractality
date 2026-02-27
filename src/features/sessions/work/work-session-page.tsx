import { useState, useEffect } from 'react'
import { WorkTimer, loadTimerState } from './work-timer'
import { WorkSessionList, countWorkFilters } from './work-session-list'
import type { WorkFilters } from './work-session-list'
import { WorkSessionForm } from './work-session-form'
import { WorkSessionDetail } from './work-session-detail'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FilterBar } from '@/components/shared/filter-bar'
import { ProjectPicker } from '@/components/shared/project-picker'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useUndo } from '@/hooks/use-undo'
import { workSessionRepository } from '@/lib/db/repositories/work-session.repository'
import type { WorkSession } from '@/schemas/work-session.schema'
import { Timer, Plus } from 'lucide-react'

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

  // Restaurer le timer si une session était en cours avant fermeture
  useEffect(() => {
    if (loadTimerState()) {
      setShowTimer(true)
    }
  }, [])

  const handleStartTimer = () => {
    setShowTimer(true)
  }

  const handleStopTimer = (duration: number) => {
    setShowTimer(false)
    setSessionFormDuration(duration)
    setFormMode('timer')
    setViewMode('form')
  }

  const handleCreateNew = () => {
    setSessionFormDuration(undefined)
    setEditingSessionId(null)
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
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sessions de Travail</h1>
          <p className="text-muted-foreground">
            Trackez votre temps de travail avec le chronomètre
          </p>
        </div>
        {!showTimer && viewMode === 'list' && (
          <div className="flex gap-2">
            <Button onClick={handleStartTimer} size="lg" className="gap-2">
              <Timer className="size-5" />
              Chronomètre
            </Button>
            <Button onClick={handleCreateNew} size="lg" variant="outline" className="gap-2">
              <Plus className="size-5" />
              Nouvelle
            </Button>
          </div>
        )}
      </div>

      {/* Timer */}
      {showTimer && (
        <div className="py-4">
          <WorkTimer onStop={handleStopTimer} />
        </div>
      )}

      {/* FilterBar — visible en mode liste sans timer */}
      {viewMode === 'list' && !showTimer && (
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="work-filter-from" className="text-xs">Du</Label>
                <Input
                  id="work-filter-from"
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="work-filter-to" className="text-xs">Au</Label>
                <Input
                  id="work-filter-to"
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </FilterBar>
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

      {/* Form Sheet */}
      <Sheet open={viewMode === 'form'} onOpenChange={(open) => !open && handleFormCancel()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingSessionId ? 'Modifier la session' : 'Nouvelle session'}
            </SheetTitle>
            <SheetDescription>
              {editingSessionId
                ? 'Modifiez les détails de votre session de travail.'
                : 'Enregistrez les détails de votre session de travail.'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <WorkSessionForm
              mode={formMode}
              initialDuration={sessionFormDuration}
              initialData={editingSessionData}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </SheetContent>
      </Sheet>

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
