import { z } from 'zod'
import { baseEntitySchema } from './base.schema'

export const journalEntrySchema = baseEntitySchema.extend({
  // Contenu texte principal — requis
  content: z.string().min(1, 'Le contenu est requis'),

  // Date/heure de l'entrée au format "YYYY-MM-DDTHH:mm" (format input datetime-local)
  // Stocké en string pour compatibilité avec le tri lexicographique
  entryDate: z.string().min(1, 'La date est requise'),

  // Propriétés chiffrées optionnelles — entiers 1-10
  mood: z.number().int().min(1).max(10).optional(),
  motivation: z.number().int().min(1).max(10).optional(),
  energy: z.number().int().min(1).max(10).optional(),

  // Localisation optionnelle (adresse texte + coordonnées GPS brutes)
  location: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),

  // Tags libres
  tags: z.array(z.string()).optional(),

  // IDs vers entries dans la table mediaBlobs — hors scope fonctionnel MVP
  mediaIds: z.array(z.string()).optional(),

  // Référence projet optionnelle (FR44 — transversal)
  projectId: z.string().uuid().optional(),
})

export type JournalEntry = z.infer<typeof journalEntrySchema>
