import { useEffect, useState } from 'react'
import { FormModal } from '@/components/shared/form-modal'
import { JournalList, countJournalFilters } from './journal-list'
import type { JournalFilters } from './journal-list'
import { JournalForm } from './journal-form'
import { JournalDetail } from './journal-detail'
import { FilterBar } from '@/components/shared/filter-bar'
import { ProjectPicker } from '@/components/shared/project-picker'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { consumeCreate } from '@/lib/create-signal'
import type { JournalEntry } from '@/schemas/journal-entry.schema'

const EMPTY_JOURNAL_FILTERS: JournalFilters = {
  projectId: null,
  from: '',
  to: '',
}

export function JournalPage() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [filters, setFilters] = useState<JournalFilters>(EMPTY_JOURNAL_FILTERS)

  // Ouvrir le formulaire de création si signalé par le bouton +
  useEffect(() => {
    if (consumeCreate()) handleAdd()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = () => {
    setSelectedEntry(null)
    setShowForm(true)
  }

  const handleSelect = (entry: JournalEntry) => {
    setSelectedEntry(entry)
    setShowDetail(true)
  }

  const handleEdit = () => {
    setShowDetail(false)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setShowDetail(false)
    setSelectedEntry(null)
  }

  return (
    <>
      <div className="px-4">
        <FilterBar
          activeCount={countJournalFilters(filters)}
          onReset={() => setFilters(EMPTY_JOURNAL_FILTERS)}
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
                <Label htmlFor="journal-filter-from" className="text-xs">Du</Label>
                <Input
                  id="journal-filter-from"
                  type="date"
                  className="w-full"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Label htmlFor="journal-filter-to" className="text-xs">Au</Label>
                <Input
                  id="journal-filter-to"
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
      <JournalList filters={filters} onAdd={handleAdd} onSelect={handleSelect} />

      {/* Formulaire création/édition — plein écran */}
      <FormModal
        open={showForm}
        onClose={handleClose}
        title={selectedEntry ? "Modifier l'entrée" : 'Nouvelle entrée'}
      >
        <JournalForm
          initialData={selectedEntry ?? undefined}
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </FormModal>

      {/* Détail entrée — plein écran */}
      <FormModal open={showDetail} onClose={handleClose} title="Entrée journal">
        {selectedEntry && (
          <JournalDetail entry={selectedEntry} onEdit={handleEdit} onDeleted={handleClose} />
        )}
      </FormModal>
    </>
  )
}
