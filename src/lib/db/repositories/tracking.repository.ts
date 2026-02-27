import { db } from '@/lib/db/database'
import { BaseRepository } from './base.repository'
import {
  trackingRecurringSchema,
  type TrackingRecurring,
} from '@/schemas/tracking-recurring.schema'
import {
  trackingResponseSchema,
  type TrackingResponse,
} from '@/schemas/tracking-response.schema'
import type { BaseEntity } from '@/schemas/base.schema'
import { toLocalDateString } from '@/lib/utils'

// ─── Helpers purs (isDueOnDate, getScheduledDates) ────────────────────────

/**
 * Détermine si un suivi est planifié pour une date donnée.
 */
export function isDueOnDate(recurring: TrackingRecurring, date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date

  switch (recurring.recurrenceType) {
    case 'daily':
      return true

    case 'weekly': {
      if (!recurring.daysOfWeek || recurring.daysOfWeek.length === 0) return false
      return recurring.daysOfWeek.includes(d.getDay())
    }

    case 'custom': {
      if (!recurring.intervalDays || recurring.intervalDays < 1) return false
      const createdAt = new Date(recurring.createdAt)
      const createdDay = new Date(
        createdAt.getFullYear(),
        createdAt.getMonth(),
        createdAt.getDate(),
      )
      const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const diffDays = Math.floor(
        (targetDay.getTime() - createdDay.getTime()) / (1000 * 60 * 60 * 24),
      )
      return diffDays >= 0 && diffDays % recurring.intervalDays === 0
    }
  }
}

/**
 * Génère les dates planifiées pour un suivi sur une période donnée.
 * Retourne les dates au format YYYY-MM-DD.
 */
export function getScheduledDates(
  recurring: TrackingRecurring,
  fromDate: Date,
  toDate: Date,
): string[] {
  const dates: string[] = []
  const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())

  while (current <= end) {
    if (isDueOnDate(recurring, current)) {
      const y = current.getFullYear()
      const m = String(current.getMonth() + 1).padStart(2, '0')
      const d = String(current.getDate()).padStart(2, '0')
      dates.push(`${y}-${m}-${d}`)
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

// ─── TrackingRecurringRepository ──────────────────────────────────────────

class TrackingRecurringRepository extends BaseRepository<TrackingRecurring> {
  constructor() {
    super(db.tracking_recurrings, trackingRecurringSchema, 'tracking_recurrings')
  }

  async getAllSorted(): Promise<TrackingRecurring[]> {
    const items = await this.table
      .filter((r) => !r.isDeleted && r.isActive)
      .toArray()
    return items.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }
}

export const trackingRecurringRepository = new TrackingRecurringRepository()

// ─── TrackingResponseRepository ───────────────────────────────────────────

class TrackingResponseRepository extends BaseRepository<TrackingResponse> {
  constructor() {
    super(db.tracking_responses, trackingResponseSchema, 'tracking_responses')
  }

  async getByDate(date: string): Promise<TrackingResponse[]> {
    return this.table
      .where('date')
      .equals(date)
      .filter((r) => !r.isDeleted)
      .toArray()
  }

  async getByRecurringId(recurringId: string): Promise<TrackingResponse[]> {
    return this.table
      .filter((r) => r.recurringId === recurringId && !r.isDeleted)
      .toArray()
  }

  async getTodayResponse(recurringId: string): Promise<TrackingResponse | undefined> {
    const today = toLocalDateString()
    const responses = await this.table
      .filter((r) => r.recurringId === recurringId && r.date === today && !r.isDeleted)
      .toArray()
    return responses[0]
  }

  async getInDateRange(from: string, to: string): Promise<TrackingResponse[]> {
    return this.table
      .where('date')
      .between(from, to, true, true)
      .filter((r) => !r.isDeleted)
      .toArray()
  }

  /**
   * Crée ou met à jour la réponse pour (recurringId, date).
   * Garantit qu'il n'y a qu'une seule réponse par (suivi, jour).
   */
  async upsertResponse(
    recurringId: string,
    date: string,
    valueData: Pick<
      TrackingResponse,
      'valueNumber' | 'valueBoolean' | 'valueChoice' | 'note'
    >,
  ): Promise<TrackingResponse> {
    const existing = await this.table
      .filter((r) => r.recurringId === recurringId && r.date === date && !r.isDeleted)
      .first()

    if (existing) {
      return this.update(existing.id, valueData)
    } else {
      return this.create({
        recurringId,
        date,
        ...valueData,
      } as unknown as Omit<TrackingResponse, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>)
    }
  }
}

export const trackingResponseRepository = new TrackingResponseRepository()
