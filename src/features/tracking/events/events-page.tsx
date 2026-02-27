import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/shared/form-modal'
import { EventList } from './event-list'
import { EventTimeline } from './event-timeline'
import { EventForm } from './event-form'
import { EventDetail } from './event-detail'
import { EventTypeManager } from './event-type-list'
import { EventFilterBar } from './event-filter-bar'
import type { EventFilters } from './event-filter-bar'
import type { TrackingEvent } from '@/schemas/tracking-event.schema'
import { consumeCreate } from '@/lib/create-signal'

type ViewMode = 'list' | 'timeline'

const EMPTY_FILTERS: EventFilters = {
  typeIds: [],
  priorities: [],
  from: '',
  to: '',
  projectId: null,
}

export function EventsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showEventForm, setShowEventForm] = useState(false)
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<TrackingEvent | null>(null)
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS)

  // Ouvrir le formulaire de création si signalé par le bouton +
  useEffect(() => {
    if (consumeCreate()) handleAdd()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = () => {
    setSelectedEvent(null)
    setShowEventForm(true)
  }

  const handleSelect = (event: TrackingEvent) => {
    setSelectedEvent(event)
    setShowDetail(true)
  }

  const handleEdit = () => {
    setShowDetail(false)
    setShowEventForm(true)
  }

  const handleClose = () => {
    setShowEventForm(false)
    setShowDetail(false)
    setSelectedEvent(null)
  }

  return (
    <>
      {/* Header : toggle List/Timeline + bouton Gérer les types + CTA Ajouter */}
      <div className="flex items-center justify-between mb-3 px-4 pt-2">
        {/* Toggle vues */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            Liste
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowTypeManager(true)}>
            Gérer les types
          </Button>
          <Button size="sm" onClick={handleAdd}>
            + Ajouter
          </Button>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="px-4">
        <EventFilterBar filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Vue principale */}
      <div className="px-4 pb-4">
        {viewMode === 'list' ? (
          <EventList filters={filters} onAdd={handleAdd} onSelect={handleSelect} />
        ) : (
          <EventTimeline filters={filters} onSelect={handleSelect} />
        )}
      </div>

      {/* Formulaire événement — plein écran */}
      <FormModal
        open={showEventForm}
        onClose={handleClose}
        title={selectedEvent ? "Modifier l'événement" : 'Nouvel événement'}
      >
        <EventForm
          initialData={selectedEvent ?? undefined}
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </FormModal>

      {/* Détail événement — plein écran */}
      <FormModal open={showDetail} onClose={handleClose} title="Détail de l'événement">
        {selectedEvent && (
          <EventDetail event={selectedEvent} onEdit={handleEdit} onDeleted={handleClose} />
        )}
      </FormModal>

      {/* Gestionnaire de types — plein écran */}
      <FormModal
        open={showTypeManager}
        onClose={() => setShowTypeManager(false)}
        title="Types d'événements"
      >
        <EventTypeManager />
      </FormModal>
    </>
  )
}
