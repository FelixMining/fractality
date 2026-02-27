import { describe, it, expect } from 'vitest'
import type { TrackingRecurring } from '@/schemas/tracking-recurring.schema'
import type { TrackingResponse } from '@/schemas/tracking-response.schema'
import {
  calcCompletionRate,
  calcCompletionRateByRecurring,
  buildNumberValueCurve,
  buildBooleanCalendar,
  filterResponsesByRecurring,
} from './recurring-stats'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRecurring(overrides: Partial<TrackingRecurring> = {}): TrackingRecurring {
  return {
    id: 'rec-1',
    userId: 'test-user-id',
    name: 'Poids',
    responseType: 'number',
    unit: 'kg',
    recurrenceType: 'daily',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isDeleted: false,
    ...overrides,
  }
}

function makeResponse(overrides: Partial<TrackingResponse> = {}): TrackingResponse {
  return {
    id: crypto.randomUUID(),
    userId: 'test-user-id',
    recurringId: 'rec-1',
    date: '2026-01-15',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    isDeleted: false,
    ...overrides,
  }
}

// ── filterResponsesByRecurring ────────────────────────────────────────────

describe('filterResponsesByRecurring', () => {
  it('filtre les réponses par recurringId', () => {
    const responses = [
      makeResponse({ recurringId: 'rec-1', date: '2026-01-10' }),
      makeResponse({ recurringId: 'rec-2', date: '2026-01-11' }),
      makeResponse({ recurringId: 'rec-1', date: '2026-01-12' }),
    ]
    const result = filterResponsesByRecurring(responses, 'rec-1')
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.recurringId === 'rec-1')).toBe(true)
  })

  it('retourne tableau vide si aucune réponse pour ce suivi', () => {
    const responses = [makeResponse({ recurringId: 'rec-2' })]
    expect(filterResponsesByRecurring(responses, 'rec-1')).toHaveLength(0)
  })
})

// ── buildNumberValueCurve ─────────────────────────────────────────────────

describe('buildNumberValueCurve', () => {
  it('construit une courbe de valeurs numériques triée par date', () => {
    const responses = [
      makeResponse({ date: '2026-01-20', valueNumber: 75.5 }),
      makeResponse({ date: '2026-01-10', valueNumber: 76.0 }),
      makeResponse({ date: '2026-01-15', valueNumber: 75.0 }),
    ]
    const result = buildNumberValueCurve(responses, 'rec-1')
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ date: '2026-01-10', value: 76.0 })
    expect(result[1]).toEqual({ date: '2026-01-15', value: 75.0 })
    expect(result[2]).toEqual({ date: '2026-01-20', value: 75.5 })
  })

  it('exclut les réponses sans valueNumber', () => {
    const responses = [
      makeResponse({ date: '2026-01-10', valueNumber: 75.0 }),
      makeResponse({ date: '2026-01-11', valueBoolean: true }), // pas de valueNumber
    ]
    const result = buildNumberValueCurve(responses, 'rec-1')
    expect(result).toHaveLength(1)
  })

  it('retourne tableau vide si aucune réponse', () => {
    expect(buildNumberValueCurve([], 'rec-1')).toEqual([])
  })
})

// ── buildBooleanCalendar ──────────────────────────────────────────────────

describe('buildBooleanCalendar', () => {
  it('construit le calendrier avec les bonnes valeurs', () => {
    const responses = [
      makeResponse({ date: '2026-01-10', valueBoolean: true }),
      makeResponse({ date: '2026-01-12', valueBoolean: false }),
    ]
    const scheduled = ['2026-01-10', '2026-01-11', '2026-01-12']
    const result = buildBooleanCalendar(responses, 'rec-1', scheduled)
    expect(result).toHaveLength(3)
    expect(result.find((r) => r.date === '2026-01-10')?.value).toBe(true)
    expect(result.find((r) => r.date === '2026-01-11')?.value).toBeNull()
    expect(result.find((r) => r.date === '2026-01-12')?.value).toBe(false)
  })

  it('retourne tableau vide si pas de dates planifiées', () => {
    const result = buildBooleanCalendar([], 'rec-1', [])
    expect(result).toEqual([])
  })
})

// ── calcCompletionRate ────────────────────────────────────────────────────

describe('calcCompletionRate', () => {
  it('calcule le taux de complétion global', () => {
    // Suivi quotidien du 2026-01-01 au 2026-01-05 = 5 dates planifiées
    const recurring = makeRecurring({ id: 'rec-1', recurrenceType: 'daily', createdAt: '2025-12-01T00:00:00.000Z' })
    const responses = [
      makeResponse({ recurringId: 'rec-1', date: '2026-01-01' }),
      makeResponse({ recurringId: 'rec-1', date: '2026-01-02' }),
      makeResponse({ recurringId: 'rec-1', date: '2026-01-03' }),
    ]
    const rate = calcCompletionRate([recurring], responses, '2026-01-01', '2026-01-05')
    expect(rate).toBe(60) // 3/5 = 60%
  })

  it('retourne 0 si aucun suivi planifié', () => {
    const rate = calcCompletionRate([], [], '2026-01-01', '2026-01-05')
    expect(rate).toBe(0)
  })

  it('retourne 100 si toutes les réponses sont données', () => {
    const recurring = makeRecurring({ id: 'rec-1', recurrenceType: 'daily', createdAt: '2025-12-01T00:00:00.000Z' })
    const responses = [
      makeResponse({ recurringId: 'rec-1', date: '2026-01-01' }),
      makeResponse({ recurringId: 'rec-1', date: '2026-01-02' }),
    ]
    const rate = calcCompletionRate([recurring], responses, '2026-01-01', '2026-01-02')
    expect(rate).toBe(100)
  })
})

// ── calcCompletionRateByRecurring ─────────────────────────────────────────

describe('calcCompletionRateByRecurring', () => {
  it('calcule le taux de complétion pour chaque suivi', () => {
    const rec1 = makeRecurring({ id: 'rec-1', name: 'Poids', recurrenceType: 'daily', createdAt: '2025-12-01T00:00:00.000Z' })
    const rec2 = makeRecurring({ id: 'rec-2', name: 'Sport', recurrenceType: 'daily', createdAt: '2025-12-01T00:00:00.000Z' })
    const responses = [
      makeResponse({ recurringId: 'rec-1', date: '2026-01-01' }),
      makeResponse({ recurringId: 'rec-1', date: '2026-01-02' }),
      // rec-2 : 0 réponse
    ]
    const result = calcCompletionRateByRecurring([rec1, rec2], responses, '2026-01-01', '2026-01-02')
    expect(result).toHaveLength(2)
    const poids = result.find((r) => r.name === 'Poids')
    expect(poids?.rate).toBe(100)
    const sport = result.find((r) => r.name === 'Sport')
    expect(sport?.rate).toBe(0)
  })
})
