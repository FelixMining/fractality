import { useLiveQuery } from 'dexie-react-hooks'
import { eventTypeRepository } from '@/lib/db/repositories/event.repository'
import { FilterBar } from '@/components/shared/filter-bar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProjectPicker } from '@/components/shared/project-picker'
import type { EventPriority } from '@/schemas/tracking-event.schema'

export interface EventFilters {
  typeIds: string[]
  priorities: EventPriority[]
  from: string
  to: string
  projectId: string | null
}

export function hasActiveFilters(filters: EventFilters): boolean {
  return (
    filters.typeIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.projectId !== null
  )
}

export function countActiveFilters(filters: EventFilters): number {
  let count = 0
  if (filters.typeIds.length > 0) count++
  if (filters.priorities.length > 0) count++
  if (filters.from !== '') count++
  if (filters.to !== '') count++
  if (filters.projectId !== null) count++
  return count
}

const PRIORITY_OPTIONS: { value: EventPriority; label: string }[] = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
]

interface EventFilterBarProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
}

export function EventFilterBar({ filters, onFiltersChange }: EventFilterBarProps) {
  const types = useLiveQuery(() => eventTypeRepository.getAllSorted(), [])

  const activeCount = countActiveFilters(filters)

  const toggleTypeFilter = (typeId: string) => {
    const updated = filters.typeIds.includes(typeId)
      ? filters.typeIds.filter((id) => id !== typeId)
      : [...filters.typeIds, typeId]
    onFiltersChange({ ...filters, typeIds: updated })
  }

  const togglePriorityFilter = (priority: EventPriority) => {
    const updated = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority]
    onFiltersChange({ ...filters, priorities: updated })
  }

  const resetFilters = () => {
    onFiltersChange({ typeIds: [], priorities: [], from: '', to: '', projectId: null })
  }

  return (
    <FilterBar activeCount={activeCount} onReset={resetFilters}>
      {/* Filtre par projet */}
      <ProjectPicker
        value={filters.projectId}
        onChange={(id) => onFiltersChange({ ...filters, projectId: id })}
        placeholder="Tous les projets"
      />

      {/* Filtre par type */}
      {types && types.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => toggleTypeFilter(type.id)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm border transition-colors ${
                  filters.typeIds.includes(type.id)
                    ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                    : 'border-border bg-transparent text-muted-foreground'
                }`}
              >
                {type.icon && <span>{type.icon}</span>}
                <span>{type.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtre par priorité */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priorité</Label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => togglePriorityFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                filters.priorities.includes(opt.value)
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-border bg-transparent text-muted-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtre par période */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Période</Label>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <Label htmlFor="filter-from" className="text-xs">Du</Label>
            <Input
              id="filter-from"
              type="date"
              className="w-full"
              value={filters.from}
              onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <Label htmlFor="filter-to" className="text-xs">Au</Label>
            <Input
              id="filter-to"
              type="date"
              className="w-full"
              value={filters.to}
              onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
            />
          </div>
        </div>
      </div>
    </FilterBar>
  )
}
