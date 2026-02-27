import { useEffect, useState } from 'react'
import { ShoppingList } from './shopping-list'
import { ShoppingForm } from './shopping-form'
import { ShoppingDetail } from './shopping-detail'
import { FormModal } from '@/components/shared/form-modal'
import { Button } from '@/components/ui/button'
import { consumeCreate } from '@/lib/create-signal'
import { Plus } from 'lucide-react'

type ViewMode = 'list' | 'detail'

export function ShoppingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  // Ouvrir le formulaire de création si signalé par le bouton +
  useEffect(() => {
    if (consumeCreate()) setFormOpen(true)
  }, [])

  const handleSelectGroup = (dateKey: string) => {
    setSelectedDateKey(dateKey)
    setViewMode('detail')
  }

  const handleBack = () => {
    setViewMode('list')
    setSelectedDateKey(null)
  }

  const handleFormSuccess = () => {
    setFormOpen(false)
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">
            Enregistrez vos courses pour mettre à jour votre stock
          </p>
        </div>
        {viewMode === 'list' && (
          <Button onClick={() => setFormOpen(true)} size="lg" className="gap-2">
            <Plus className="size-5" />
            Nouvelle course
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <ShoppingList
          onSelectGroup={handleSelectGroup}
          onAdd={() => setFormOpen(true)}
        />
      )}

      {viewMode === 'detail' && selectedDateKey && (
        <ShoppingDetail
          dateKey={selectedDateKey}
          onBack={handleBack}
        />
      )}

      {/* Formulaire course — plein écran */}
      <FormModal open={formOpen} onClose={() => setFormOpen(false)} title="Nouvelle course">
        <ShoppingForm onSuccess={handleFormSuccess} onCancel={() => setFormOpen(false)} />
      </FormModal>
    </div>
  )
}
