import { useEffect, useState } from 'react'
import { RoutineList } from './routine-list'
import { RoutineForm } from './routine-form'
import { FormModal } from '@/components/shared/form-modal'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useUndo } from '@/hooks/use-undo'
import { routineRepository } from '@/lib/db/repositories/routine.repository'
import { deleteTrackingForRoutine } from '@/lib/services/routine-tracking.service'
import { consumeCreate } from '@/lib/create-signal'
import { Plus } from 'lucide-react'
import type { StockRoutine } from '@/schemas/stock-routine.schema'

export function RoutinesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<StockRoutine | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingRoutine, setDeletingRoutine] = useState<StockRoutine | null>(null)

  const { withUndo } = useUndo()

  // Ouvrir le formulaire de création si signalé par le bouton +
  useEffect(() => {
    if (consumeCreate()) handleAdd()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = () => {
    setEditingRoutine(null)
    setFormOpen(true)
  }

  const handleEdit = (routine: StockRoutine) => {
    setEditingRoutine(routine)
    setFormOpen(true)
  }

  const handleDeleteRequest = (routine: StockRoutine) => {
    setDeletingRoutine(routine)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingRoutine) return

    const toDelete = deletingRoutine // capture avant les opérations async

    await withUndo(
      `Routine "${toDelete.name}" supprimée`,
      async () => {
        await routineRepository.softDelete(toDelete.id)
      },
      async () => {
        await routineRepository.restore(toDelete.id)
      },
    )

    // Story 6.4 — Supprimer le suivi lié (non-bloquant)
    try {
      await deleteTrackingForRoutine(toDelete)
    } catch {
      // non-bloquant
    }

    setDeleteDialogOpen(false)
    setDeletingRoutine(null)
  }

  const handleFormSuccess = () => {
    setFormOpen(false)
    setEditingRoutine(null)
  }

  const handleFormCancel = () => {
    setFormOpen(false)
    setEditingRoutine(null)
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Routines</h1>
          <p className="text-muted-foreground">
            Gérez vos routines de consommation pour estimer vos jours de stock restants
          </p>
        </div>
        <Button onClick={handleAdd} size="lg" className="gap-2">
          <Plus className="size-5" />
          Créer une routine
        </Button>
      </div>

      {/* Liste */}
      <RoutineList
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      {/* Formulaire routine — plein écran */}
      <FormModal
        open={formOpen}
        onClose={handleFormCancel}
        title={editingRoutine ? 'Modifier la routine' : 'Nouvelle routine'}
      >
        <RoutineForm
          initialData={editingRoutine ?? undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </FormModal>

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer cette routine ?"
        description="Cette routine sera déplacée dans la corbeille. Vous pourrez la restaurer depuis la corbeille."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
