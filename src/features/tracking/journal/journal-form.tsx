import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { journalEntryRepository } from '@/lib/db/repositories/journal.repository'
import { useUndo } from '@/hooks/use-undo'
import { formatLocalDatetime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocationField } from '@/components/shared/location-field'
import { toast } from 'sonner'
import type { JournalEntry } from '@/schemas/journal-entry.schema'

// ─── Schéma de formulaire ──────────────────────────────────────────────────

const journalFormSchema = z.object({
  entryDate: z.string().min(1, 'La date est requise'),
  content: z.string().min(1, 'Le contenu est requis'),
  mood: z.number().int().min(1).max(10).optional(),
  motivation: z.number().int().min(1).max(10).optional(),
  energy: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
})

type JournalFormValues = z.infer<typeof journalFormSchema>

// ─── Couleurs statiques des sliders (Tailwind v4 — pas de classes dynamiques) ─

const SLIDER_TEXT_COLORS: Record<string, string> = {
  purple: 'text-purple-400',
  blue: 'text-blue-400',
  green: 'text-green-400',
}

// ─── Composant PropertySlider ─────────────────────────────────────────────

interface PropertySliderProps {
  label: string
  color: 'purple' | 'blue' | 'green'
  active: boolean
  onActivate: () => void
  value: number
  onChange: (v: number) => void
}

function PropertySlider({ label, color, active, onActivate, value, onChange }: PropertySliderProps) {
  return (
    <div className={`flex items-center gap-3 transition-opacity ${!active ? 'opacity-50' : ''}`}>
      <span className={`text-sm w-24 shrink-0 font-medium ${active ? SLIDER_TEXT_COLORS[color] : 'text-muted-foreground'}`}>
        {label}
      </span>
      {!active ? (
        <button
          type="button"
          onClick={onActivate}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Ajouter
        </button>
      ) : (
        <>
          <input
            type="range"
            min={1}
            max={10}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-muted"
            aria-label={`${label} ${value}/10`}
          />
          <span className="text-sm font-mono w-6 text-center tabular-nums">{value}</span>
        </>
      )}
    </div>
  )
}

// ─── JournalForm ─────────────────────────────────────────────────────────

interface JournalFormProps {
  initialData?: JournalEntry
  onSuccess?: () => void
  onCancel?: () => void
}

export function JournalForm({ initialData, onSuccess, onCancel }: JournalFormProps) {
  const isEditing = Boolean(initialData)
  const { withUndo } = useUndo()

  // Tags
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // État actif des sliders
  const [moodActive, setMoodActive] = useState(initialData?.mood !== undefined)
  const [motivationActive, setMotivationActive] = useState(initialData?.motivation !== undefined)
  const [energyActive, setEnergyActive] = useState(initialData?.energy !== undefined)

  // Charger les tags existants pour l'auto-complétion
  useEffect(() => {
    journalEntryRepository.getAllTags().then(setAllTags).catch(() => {})
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema),
    defaultValues: initialData
      ? {
          entryDate: initialData.entryDate,
          content: initialData.content,
          mood: initialData.mood,
          motivation: initialData.motivation,
          energy: initialData.energy,
          tags: initialData.tags ?? [],
          location: initialData.location ?? '',
          locationLat: initialData.locationLat,
          locationLng: initialData.locationLng,
        }
      : {
          entryDate: formatLocalDatetime(new Date()),
          content: '',
          mood: undefined,
          motivation: undefined,
          energy: undefined,
          tags: [],
          location: '',
          locationLat: undefined,
          locationLng: undefined,
        },
  })

  const watchedTags = watch('tags') ?? []
  const watchedMood = watch('mood') ?? 5
  const watchedMotivation = watch('motivation') ?? 5
  const watchedEnergy = watch('energy') ?? 5
  const watchedLocation = watch('location') ?? ''
  const watchedLat = watch('locationLat')
  const watchedLng = watch('locationLng')

  // Suggestions filtrées
  const suggestions = tagInput.length > 0 && showSuggestions
    ? allTags.filter(
        (t) =>
          t.toLowerCase().includes(tagInput.toLowerCase()) &&
          !watchedTags.includes(t),
      )
    : []

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || watchedTags.includes(trimmed)) {
      setTagInput('')
      setShowSuggestions(false)
      return
    }
    setValue('tags', [...watchedTags, trimmed])
    setTagInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    setValue('tags', watchedTags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
    // Backspace sur champ vide = supprime le dernier tag
    if (e.key === 'Backspace' && tagInput === '' && watchedTags.length > 0) {
      removeTag(watchedTags[watchedTags.length - 1])
    }
  }

  const onSubmit = async (data: JournalFormValues) => {
    try {
      const entryData = {
        content: data.content,
        entryDate: data.entryDate,
        mood: moodActive ? data.mood : undefined,
        motivation: motivationActive ? data.motivation : undefined,
        energy: energyActive ? data.energy : undefined,
        tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
        location: data.location || undefined,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
      }

      if (isEditing && initialData) {
        const old = { ...initialData }
        await withUndo(
          'Entrée journal modifiée',
          async () => {
            await journalEntryRepository.update(initialData.id, entryData)
          },
          async () => {
            await journalEntryRepository.update(initialData.id, {
              content: old.content,
              entryDate: old.entryDate,
              mood: old.mood,
              motivation: old.motivation,
              energy: old.energy,
              tags: old.tags,
              location: old.location,
              locationLat: old.locationLat,
              locationLng: old.locationLng,
            })
          },
        )
        toast.success('Entrée modifiée')
      } else {
        const created = await journalEntryRepository.create(
          entryData as Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>,
        )
        await withUndo(
          'Entrée journal créée',
          async () => {
            // action déjà effectuée avant withUndo
          },
          async () => {
            await journalEntryRepository.softDelete(created.id)
          },
        )
        toast.success('Entrée créée')
      }

      onSuccess?.()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Date / Heure */}
      <div className="space-y-2">
        <Label htmlFor="journal-date">Date et heure *</Label>
        <Input
          id="journal-date"
          type="datetime-local"
          {...register('entryDate')}
          aria-describedby={errors.entryDate ? 'journal-date-error' : undefined}
        />
        {errors.entryDate && (
          <p id="journal-date-error" className="text-sm text-destructive">
            {errors.entryDate.message}
          </p>
        )}
      </div>

      {/* Contenu texte */}
      <div className="space-y-2">
        <Label htmlFor="journal-content">Journal *</Label>
        <textarea
          id="journal-content"
          rows={6}
          placeholder="Qu'avez-vous en tête ?"
          className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          {...register('content')}
          aria-describedby={errors.content ? 'journal-content-error' : undefined}
        />
        {errors.content && (
          <p id="journal-content-error" className="text-sm text-destructive">
            {errors.content.message}
          </p>
        )}
      </div>

      {/* Localisation avec GPS */}
      <div className="space-y-2">
        <Label htmlFor="journal-location">Lieu (optionnel)</Label>
        <LocationField
          id="journal-location"
          address={watchedLocation}
          onAddressChange={(v) => setValue('location', v)}
          lat={watchedLat}
          lng={watchedLng}
          onCoordsChange={(lat, lng) => {
            setValue('locationLat', lat)
            setValue('locationLng', lng)
          }}
        />
      </div>

      {/* Propriétés chiffrées */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">État du moment (optionnel)</p>
        <PropertySlider
          label="Humeur"
          color="purple"
          active={moodActive}
          onActivate={() => {
            setMoodActive(true)
            setValue('mood', 5)
          }}
          value={watchedMood}
          onChange={(v) => setValue('mood', v)}
        />
        <PropertySlider
          label="Motivation"
          color="blue"
          active={motivationActive}
          onActivate={() => {
            setMotivationActive(true)
            setValue('motivation', 5)
          }}
          value={watchedMotivation}
          onChange={(v) => setValue('motivation', v)}
        />
        <PropertySlider
          label="Énergie"
          color="green"
          active={energyActive}
          onActivate={() => {
            setEnergyActive(true)
            setValue('energy', 5)
          }}
          value={watchedEnergy}
          onChange={(v) => setValue('energy', v)}
        />
      </div>

      {/* Tags avec auto-complétion */}
      <div className="space-y-2">
        <Label>Tags (optionnel)</Label>

        {/* Badges des tags sélectionnés */}
        {watchedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {watchedTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-muted-foreground hover:text-foreground leading-none"
                  aria-label={`Supprimer le tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input tag */}
        <div className="relative">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={handleTagKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Délai pour permettre le clic sur une suggestion
              setTimeout(() => setShowSuggestions(false), 200)
            }}
            placeholder="Ajouter un tag…"
            className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Saisir un tag"
          />

          {/* Dropdown suggestions */}
          {suggestions.length > 0 && (
            <ul
              className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl overflow-hidden z-50 shadow-md"
              role="listbox"
            >
              {suggestions.slice(0, 5).map((s) => (
                <li key={s} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onMouseDown={(e) => {
                      // Utiliser onMouseDown pour éviter que onBlur ferme avant le clic
                      e.preventDefault()
                      addTag(s)
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Entrée ou virgule pour valider</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isEditing ? 'Modifier' : 'Créer'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}
