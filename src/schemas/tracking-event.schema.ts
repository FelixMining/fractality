import { z } from 'zod'
import { baseEntitySchema } from './base.schema'

export const eventPriorityEnum = z.enum(['low', 'medium', 'high'])

export const trackingEventSchema = baseEntitySchema.extend({
  title: z.string().min(1, 'Le titre est requis'),
  // Référence vers un EventType (optionnel — événement sans catégorie possible)
  typeId: z.string().uuid().optional(),
  // ISO 8601 datetime local : "2026-02-22T14:30" (format input datetime-local)
  eventDate: z.string().min(1, 'La date est requise'),
  priority: eventPriorityEnum.default('medium'),
  description: z.string().optional(),
  location: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  // IDs vers entrées dans la table mediaBlobs (hors scope UI pour cette story)
  imageIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().uuid().optional(),
})

export type TrackingEvent = z.infer<typeof trackingEventSchema>
export type EventPriority = z.infer<typeof eventPriorityEnum>
