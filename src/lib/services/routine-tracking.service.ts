import { routineRepository } from '@/lib/db/repositories/routine.repository'
import { trackingRecurringRepository } from '@/lib/db/repositories/tracking.repository'
import { stockRepository } from '@/lib/db/repositories/stock.repository'
import type { StockRoutine } from '@/schemas/stock-routine.schema'
import type { TrackingRecurring } from '@/schemas/tracking-recurring.schema'
import type { BaseEntity } from '@/schemas/base.schema'

type TrackingCreateData = Omit<TrackingRecurring, keyof BaseEntity>

/**
 * Crée un TrackingRecurring lié à la routine de consommation.
 * Met à jour la routine avec linkedTrackingId.
 * Appelé après la création d'une routine dans RoutineForm.
 */
export async function createTrackingForRoutine(routine: StockRoutine): Promise<void> {
  const trackingData: TrackingCreateData = {
    name: routine.name,
    responseType: 'boolean',
    recurrenceType: routine.recurrenceType,
    daysOfWeek: routine.daysOfWeek,
    intervalDays: routine.intervalDays,
    isActive: true,
    routineId: routine.id,
    routineProductId: routine.productId,
    routineQuantity: routine.quantity,
  }

  const tracking = await trackingRecurringRepository.create(trackingData as unknown as Omit<TrackingRecurring, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>)

  // Lier la routine au suivi créé (pattern get+put via BaseRepository)
  await routineRepository.update(routine.id, { linkedTrackingId: tracking.id })
}

/**
 * Synchronise le TrackingRecurring lié quand la routine est modifiée.
 * Appelé après la modification d'une routine dans RoutineForm.
 * Ne fait rien si linkedTrackingId est absent (routines antérieures à la story 6.4).
 */
export async function syncTrackingForRoutine(routine: StockRoutine): Promise<void> {
  if (!routine.linkedTrackingId) return

  await trackingRecurringRepository.update(routine.linkedTrackingId, {
    name: routine.name,
    recurrenceType: routine.recurrenceType,
    daysOfWeek: routine.daysOfWeek,
    intervalDays: routine.intervalDays,
    routineQuantity: routine.quantity,
    routineProductId: routine.productId,
  })
}

/**
 * Soft delete le TrackingRecurring lié quand la routine est supprimée.
 * Appelé depuis RoutinesPage.handleDeleteConfirm.
 * Ne fait rien si linkedTrackingId est absent.
 */
export async function deleteTrackingForRoutine(routine: StockRoutine): Promise<void> {
  if (!routine.linkedTrackingId) return
  await trackingRecurringRepository.softDelete(routine.linkedTrackingId)
}

/**
 * Gère la déduction/remise en stock lors de la réponse à un suivi lié à une routine.
 * Appelé depuis RecurringResponse après upsertResponse pour les suivis boolean.
 *
 * Logique :
 *   newValue true  + previousValue !== true  → déduire routineQuantity du stock
 *   newValue false + previousValue === true   → remettre routineQuantity en stock
 *   valeurs identiques                        → pas de changement
 */
export async function handleRoutineConsumption(
  recurring: TrackingRecurring,
  newValue: boolean,
  previousValue: boolean | undefined,
): Promise<void> {
  if (!recurring.routineId || !recurring.routineProductId || !recurring.routineQuantity) return

  const delta = (() => {
    if (newValue === true && previousValue !== true) return -recurring.routineQuantity
    if (newValue === false && previousValue === true) return recurring.routineQuantity
    return 0
  })()

  if (delta === 0) return

  await stockRepository.adjustStock(recurring.routineProductId, delta)
}
