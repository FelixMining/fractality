import { useEffect, useState } from 'react'
import { RecurringList, countRecurringFilters } from './recurring-list'
import type { RecurringFilters } from './recurring-list'
import { RecurringForm } from './recurring-form'
import { RecurringHistory } from './recurring-history'
import { FilterBar } from '@/components/shared/filter-bar'
import { FormModal } from '@/components/shared/form-modal'
import { Label } from '@/components/ui/label'
import { consumeCreate } from '@/lib/create-signal'
import type { TrackingRecurring, TrackingRecurrenceType } from '@/schemas/tracking-recurring.schema'

const RECURRENCE_TYPE_LABELS: Record<TrackingRecurrenceType, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  custom: 'Personnalisé',
}

const EMPTY_RECURRING_FILTERS: RecurringFilters = {
  recurrenceTypes: [],
}

export function RecurringPage() {
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedRecurring, setSelectedRecurring] = useState<TrackingRecurring | null>(null)
  const [filters, setFilters] = useState<RecurringFilters>(EMPTY_RECURRING_FILTERS)

  // Ouvrir le formulaire de création si signalé par le bouton +
  useEffect(() => {
    if (consumeCreate()) handleAdd()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = () => {
    setSelectedRecurring(null)
    setShowForm(true)
  }

  const handleEdit = (recurring: TrackingRecurring) => {
    setSelectedRecurring(recurring)
    setShowForm(true)
  }

  const handleShowHistory = (recurring: TrackingRecurring) => {
    setSelectedRecurring(recurring)
    setShowHistory(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setShowHistory(false)
    setSelectedRecurring(null)
  }

  return (
    <>
      <div className="px-4">
        <FilterBar
          activeCount={countRecurringFilters(filters)}
          onReset={() => setFilters(EMPTY_RECURRING_FILTERS)}
        >
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(RECURRENCE_TYPE_LABELS) as TrackingRecurrenceType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    const updated = filters.recurrenceTypes.includes(type)
                      ? filters.recurrenceTypes.filter((t) => t !== type)
                      : [...filters.recurrenceTypes, type]
                    setFilters({ recurrenceTypes: updated })
                  }}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    filters.recurrenceTypes.includes(type)
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : 'border-border bg-transparent text-muted-foreground'
                  }`}
                >
                  {RECURRENCE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </FilterBar>
      </div>
      <RecurringList
        filters={filters}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onShowHistory={handleShowHistory}
      />

      {/* Formulaire création/édition — plein écran */}
      <FormModal
        open={showForm}
        onClose={handleClose}
        title={selectedRecurring ? 'Modifier le suivi' : 'Créer un suivi'}
      >
        <RecurringForm
          initialData={selectedRecurring ?? undefined}
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </FormModal>

      {/* Historique — saisie rétroactive */}
      <FormModal
        open={showHistory}
        onClose={handleClose}
        title={`Historique — ${selectedRecurring?.name ?? ''}`}
      >
        {selectedRecurring && <RecurringHistory recurring={selectedRecurring} />}
      </FormModal>
    </>
  )
}
