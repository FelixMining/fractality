import { describe, it, expect } from 'vitest'
import type { TrackingEvent } from '@/schemas/tracking-event.schema'
import type { EventType } from '@/schemas/tracking-event-type.schema'
import {
  filterEventsByPeriod,
  countEventsByWeek,
  countEventsByType,
  buildEventTypeDistribution,
} from './event-stats'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<TrackingEvent> = {}): TrackingEvent {
  return {
    id: crypto.randomUUID(),
    userId: 'test-user-id',
    title: 'Test Event',
    eventDate: '2026-01-15T10:00',
    priority: 'medium',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    isDeleted: false,
    ...overrides,
  }
}

function makeEventType(overrides: Partial<EventType> = {}): EventType {
  return {
    id: 'type-1',
    userId: 'test-user-id',
    name: 'Santé',
    color: '#EF4444',
    icon: '🏥',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isDeleted: false,
    ...overrides,
  }
}

// ── filterEventsByPeriod ──────────────────────────────────────────────────

describe('filterEventsByPeriod', () => {
  it('filtre les événements dans la période', () => {
    const events = [
      makeEvent({ eventDate: '2026-01-10T09:00' }),
      makeEvent({ eventDate: '2026-01-20T14:00' }),
      makeEvent({ eventDate: '2026-02-05T08:00' }),
    ]
    const result = filterEventsByPeriod(events, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(2)
  })

  it('inclut les bornes de la période', () => {
    const events = [
      makeEvent({ eventDate: '2026-01-01T00:00' }),
      makeEvent({ eventDate: '2026-01-31T23:59' }),
    ]
    const result = filterEventsByPeriod(events, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(2)
  })

  it('retourne tableau vide si aucun événement dans la période', () => {
    const events = [makeEvent({ eventDate: '2025-12-01T10:00' })]
    const result = filterEventsByPeriod(events, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(0)
  })
})

// ── countEventsByWeek ─────────────────────────────────────────────────────

describe('countEventsByWeek', () => {
  it('compte les événements par semaine', () => {
    const events = [
      makeEvent({ eventDate: '2026-01-05T10:00' }), // lundi sem 1
      makeEvent({ eventDate: '2026-01-07T10:00' }), // mercredi sem 1
      makeEvent({ eventDate: '2026-01-12T10:00' }), // lundi sem 2
    ]
    const result = countEventsByWeek(events)
    expect(result).toHaveLength(2)
    expect(result[0].count).toBe(2)
    expect(result[1].count).toBe(1)
  })

  it('retourne tableau vide pour entrée vide', () => {
    expect(countEventsByWeek([])).toEqual([])
  })

  it('trie les semaines chronologiquement', () => {
    const events = [
      makeEvent({ eventDate: '2026-01-19T10:00' }),
      makeEvent({ eventDate: '2026-01-05T10:00' }),
    ]
    const result = countEventsByWeek(events)
    expect(result[0].week < result[1].week).toBe(true)
  })
})

// ── countEventsByType ─────────────────────────────────────────────────────

describe('countEventsByType', () => {
  it('compte les événements par typeId', () => {
    const events = [
      makeEvent({ typeId: 'type-1' }),
      makeEvent({ typeId: 'type-1' }),
      makeEvent({ typeId: 'type-2' }),
      makeEvent({ typeId: undefined }), // sans type
    ]
    const result = countEventsByType(events)
    expect(result.get('type-1')).toBe(2)
    expect(result.get('type-2')).toBe(1)
    expect(result.get('__none__')).toBe(1)
  })

  it('retourne Map vide pour entrée vide', () => {
    expect(countEventsByType([])).toEqual(new Map())
  })
})

// ── buildEventTypeDistribution ────────────────────────────────────────────

describe('buildEventTypeDistribution', () => {
  it('construit la distribution par type', () => {
    const type1 = makeEventType({ id: 'type-1', name: 'Santé', color: '#EF4444' })
    const events = [
      makeEvent({ typeId: 'type-1' }),
      makeEvent({ typeId: 'type-1' }),
      makeEvent({ typeId: undefined }),
    ]
    const result = buildEventTypeDistribution(events, [type1])
    const sante = result.find((r) => r.name === 'Santé')
    expect(sante?.value).toBe(2)
    const sansType = result.find((r) => r.name === 'Sans type')
    expect(sansType?.value).toBe(1)
  })

  it('retourne tableau vide si pas d\'événements', () => {
    expect(buildEventTypeDistribution([], [])).toEqual([])
  })
})
