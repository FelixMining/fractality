import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { trackingEventRepository } from '@/lib/db/repositories/event.repository'
import { eventTypeRepository } from '@/lib/db/repositories/event.repository'
import { useUndo } from '@/hooks/use-undo'
import { formatLocalDatetime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocationField } from '@/components/shared/location-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { TrackingEvent } from '@/schemas/tracking-event.schema'

const eventFormSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  typeId: z.string().optional(),
  eventDate: z.string().min(1, 'La date est requise'),
  description: z.string().optional(),
  location: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
})

type EventFormValues = z.infer<typeof eventFormSchema>

interface EventFormProps {
  initialData?: TrackingEvent
  onSuccess?: () => void
  onCancel?: () => void
}

export function EventForm({ initialData, onSuccess, onCancel }: EventFormProps) {
  const isEditing = Boolean(initialData)
  const { withUndo } = useUndo()
  const types = useLiveQuery(() => eventTypeRepository.getAllSorted(), [])

  // Garde en mémoire le dernier titre auto-rempli pour ne pas écraser une saisie manuelle
  const autoFilledTitle = useRef<string>('')

  const defaultDate = formatLocalDatetime(new Date())

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          typeId: initialData.typeId ?? '',
          eventDate: initialData.eventDate,
          description: initialData.description ?? '',
          location: initialData.location ?? '',
          locationLat: initialData.locationLat,
          locationLng: initialData.locationLng,
        }
      : {
          title: '',
          typeId: '',
          eventDate: defaultDate,
          description: '',
          location: '',
          locationLat: undefined,
          locationLng: undefined,
        },
  })

  const currentTypeId = watch('typeId')
  const watchedLocation = watch('location') ?? ''
  const watchedLat = watch('locationLat')
  const watchedLng = watch('locationLng')

  // Auto-remplir le titre quand un type est sélectionné
  useEffect(() => {
    if (!types || isEditing) return
    const type = types.find((t) => t.id === currentTypeId)
    if (type) {
      const currentTitle = watch('title')
      // Ne remplace le titre que s'il est vide ou correspond au précédent auto-remplissage
      if (currentTitle === '' || currentTitle === autoFilledTitle.current) {
        const newTitle = type.name
        setValue('title', newTitle)
        autoFilledTitle.current = newTitle
      }
    } else if (!currentTypeId) {
      const currentTitle = watch('title')
      if (currentTitle === autoFilledTitle.current) {
        setValue('title', '')
        autoFilledTitle.current = ''
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTypeId, types])

  const onSubmit = async (data: EventFormValues) => {
    try {
      const eventData = {
        title: data.title,
        typeId: data.typeId || undefined,
        eventDate: data.eventDate,
        description: data.description || undefined,
        location: data.location || undefined,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
      }

      if (isEditing && initialData) {
        const old = { ...initialData }
        await withUndo(
          `Événement "${old.title}" modifié`,
          async () => {
            await trackingEventRepository.update(initialData.id, eventData)
          },
          async () => {
            await trackingEventRepository.update(initialData.id, {
              title: old.title,
              typeId: old.typeId,
              eventDate: old.eventDate,
              description: old.description,
              location: old.location,
              locationLat: old.locationLat,
              locationLng: old.locationLng,
            })
          },
        )
        toast.success('Événement modifié')
      } else {
        const created = await trackingEventRepository.create(
          eventData as Omit<TrackingEvent, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>,
        )
        await withUndo(
          `Événement "${created.title}" créé`,
          async () => {
            // action déjà effectuée
          },
          async () => {
            await trackingEventRepository.softDelete(created.id)
          },
        )
        toast.success('Événement créé')
      }

      onSuccess?.()
    } catch {
      toast.error("Erreur lors de la sauvegarde de l'événement")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type — en premier pour auto-remplir le titre */}
      <div className="space-y-2">
        <Label htmlFor="event-type">Type (optionnel)</Label>
        <Select
          value={currentTypeId || '__none__'}
          onValueChange={(v) => setValue('typeId', v === '__none__' ? '' : v)}
        >
          <SelectTrigger id="event-type">
            <SelectValue placeholder="Aucun type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Aucun type</SelectItem>
            {types?.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.icon ? `${type.icon} ` : ''}{type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Titre */}
      <div className="space-y-2">
        <Label htmlFor="event-title">Titre *</Label>
        <Input
          id="event-title"
          placeholder="Ex: Rendez-vous cardiologue, Départ en vacances…"
          {...register('title')}
          aria-describedby={errors.title ? 'event-title-error' : undefined}
        />
        {errors.title && (
          <p id="event-title-error" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Date / Heure */}
      <div className="space-y-2">
        <Label htmlFor="event-date">Date et heure *</Label>
        <Input
          id="event-date"
          type="datetime-local"
          {...register('eventDate')}
          aria-describedby={errors.eventDate ? 'event-date-error' : undefined}
        />
        {errors.eventDate && (
          <p id="event-date-error" className="text-sm text-destructive">
            {errors.eventDate.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="event-description">Description (optionnel)</Label>
        <textarea
          id="event-description"
          rows={3}
          placeholder="Détails de l'événement…"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          {...register('description')}
        />
      </div>

      {/* Localisation avec GPS */}
      <div className="space-y-2">
        <Label htmlFor="event-location">Localisation (optionnel)</Label>
        <LocationField
          id="event-location"
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

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isEditing ? "Modifier l'événement" : "Créer l'événement"}
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
