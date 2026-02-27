import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { workoutProgramRepository } from '@/lib/db/repositories/workout-program.repository'
import type { WorkoutProgram } from '@/schemas/workout-program.schema'
import { ProgramList } from './program-list'
import { ProgramForm } from './program-form'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FormModal } from '@/components/shared/form-modal'
import { useUndo } from '@/hooks/use-undo'
import { Button } from '@/components/ui/button'
import { consumeCreate } from '@/lib/create-signal'
import { Plus } from 'lucide-react'

/**
 * Page principale de gestion des programmes d'entraînement.
 */
export function ProgramsPage() {
  const navigate = useNavigate()
  const { withUndo } = useUndo()

  const [showForm, setShowForm] = useState(false)
  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    programId: string
    programName: string
  }>({ open: false, programId: '', programName: '' })

  // Ouvrir le formulaire de création si signalé par le bouton +
  useEffect(() => {
    if (consumeCreate()) handleCreateClick()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateClick = () => {
    setEditingProgram(null)
    setShowForm(true)
  }

  const handleEdit = (program: WorkoutProgram) => {
    setEditingProgram(program)
    setShowForm(true)
  }

  const handleView = (program: WorkoutProgram) => {
    void navigate({
      to: '/sessions/workout/programs/$programId',
      params: { programId: program.id },
    })
  }

  const handleDelete = (program: WorkoutProgram) => {
    setDeleteConfirm({
      open: true,
      programId: program.id,
      programName: program.name,
    })
  }

  const handleConfirmDelete = async () => {
    const { programId, programName } = deleteConfirm
    try {
      await withUndo(
        `Programme "${programName}" supprimé`,
        async () => {
          await workoutProgramRepository.deleteProgram(programId)
        },
        async () => {
          await workoutProgramRepository.restoreProgram(programId)
        }
      )
      setDeleteConfirm({ open: false, programId: '', programName: '' })
    } catch (error) {
      console.error('Error deleting program:', error)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingProgram(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mes programmes</h1>
        <Button onClick={handleCreateClick} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau
        </Button>
      </div>

      <ProgramList onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />

      {/* Formulaire création/édition — plein écran */}
      <FormModal
        open={showForm}
        onClose={handleFormClose}
        title={editingProgram ? 'Modifier le programme' : 'Nouveau programme'}
      >
        <ProgramForm initialData={editingProgram || undefined} onSuccess={handleFormClose} />
      </FormModal>

      {/* ConfirmDialog pour suppression */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && setDeleteConfirm({ open: false, programId: '', programName: '' })}
        title="Supprimer le programme"
        description={`Êtes-vous sûr de vouloir supprimer le programme "${deleteConfirm.programName}" ? Toutes ses séances-types seront également supprimées.`}
        onConfirm={handleConfirmDelete}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="destructive"
      />
    </div>
  )
}
