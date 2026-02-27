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
    <>
      {/* CTA */}
      {viewMode === 'list' && (
        <div className="flex justify-center px-4">
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Nouvelle course
          </Button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' && (
        <ShoppingList
          onSelectGroup={handleSelectGroup}
          onAdd={() => setFormOpen(true)}
        />
      )}

      {viewMode === 'detail' && selectedDateKey && (
        <div className="px-4">
          <ShoppingDetail
            dateKey={selectedDateKey}
            onBack={handleBack}
          />
        </div>
      )}

      {/* Formulaire course — plein écran */}
      <FormModal open={formOpen} onClose={() => setFormOpen(false)} title="Nouvelle course">
        <ShoppingForm onSuccess={handleFormSuccess} onCancel={() => setFormOpen(false)} />
      </FormModal>
    </>
  )
}
