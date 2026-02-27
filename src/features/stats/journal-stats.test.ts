import { describe, it, expect } from 'vitest'
import type { JournalEntry } from '@/schemas/journal-entry.schema'
import {
  filterEntriesByPeriod,
  countEntriesByWeek,
  buildPropertyCurves,
  calcTopTags,
} from './journal-stats'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: crypto.randomUUID(),
    userId: 'test-user-id',
    content: 'Entrée de test',
    entryDate: '2026-01-15T10:00',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    isDeleted: false,
    ...overrides,
  }
}

// ── filterEntriesByPeriod ─────────────────────────────────────────────────

describe('filterEntriesByPeriod', () => {
  it('filtre les entrées dans la période', () => {
    const entries = [
      makeEntry({ entryDate: '2026-01-10T08:00' }),
      makeEntry({ entryDate: '2026-01-20T14:00' }),
      makeEntry({ entryDate: '2026-02-01T09:00' }),
    ]
    const result = filterEntriesByPeriod(entries, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(2)
  })

  it('inclut les bornes', () => {
    const entries = [
      makeEntry({ entryDate: '2026-01-01T00:00' }),
      makeEntry({ entryDate: '2026-01-31T23:59' }),
    ]
    expect(filterEntriesByPeriod(entries, '2026-01-01', '2026-01-31')).toHaveLength(2)
  })

  it('retourne tableau vide si aucune entrée dans la période', () => {
    const entries = [makeEntry({ entryDate: '2025-12-01T10:00' })]
    expect(filterEntriesByPeriod(entries, '2026-01-01', '2026-01-31')).toHaveLength(0)
  })
})

// ── countEntriesByWeek ────────────────────────────────────────────────────

describe('countEntriesByWeek', () => {
  it('compte les entrées par semaine', () => {
    const entries = [
      makeEntry({ entryDate: '2026-01-05T08:00' }), // lundi sem 1
      makeEntry({ entryDate: '2026-01-07T09:00' }), // mercredi sem 1
      makeEntry({ entryDate: '2026-01-12T10:00' }), // lundi sem 2
    ]
    const result = countEntriesByWeek(entries)
    expect(result).toHaveLength(2)
    expect(result[0].count).toBe(2)
    expect(result[1].count).toBe(1)
  })

  it('trie chronologiquement', () => {
    const entries = [
      makeEntry({ entryDate: '2026-01-19T10:00' }),
      makeEntry({ entryDate: '2026-01-05T10:00' }),
    ]
    const result = countEntriesByWeek(entries)
    expect(result[0].week < result[1].week).toBe(true)
  })

  it('retourne tableau vide pour entrée vide', () => {
    expect(countEntriesByWeek([])).toEqual([])
  })
})

// ── buildPropertyCurves ───────────────────────────────────────────────────

describe('buildPropertyCurves', () => {
  it('construit les courbes des propriétés', () => {
    const entries = [
      makeEntry({ entryDate: '2026-01-10T08:00', mood: 7, motivation: 8 }),
      makeEntry({ entryDate: '2026-01-15T08:00', mood: 6, energy: 9 }),
    ]
    const result = buildPropertyCurves(entries)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-01-10')
    expect(result[0].humeur).toBe(7)
    expect(result[0].motivation).toBe(8)
    expect(result[0].energie).toBeUndefined()
  })

  it('exclut les entrées sans aucune propriété', () => {
    const entries = [
      makeEntry({ entryDate: '2026-01-10T08:00', mood: 7 }),
      makeEntry({ entryDate: '2026-01-11T08:00' }), // pas de propriétés
    ]
    const result = buildPropertyCurves(entries)
    expect(result).toHaveLength(1)
  })

  it('trie par date', () => {
    const entries = [
      makeEntry({ entryDate: '2026-01-20T08:00', mood: 5 }),
      makeEntry({ entryDate: '2026-01-05T08:00', mood: 8 }),
    ]
    const result = buildPropertyCurves(entries)
    expect(result[0].date).toBe('2026-01-05')
    expect(result[1].date).toBe('2026-01-20')
  })

  it('retourne tableau vide si aucune entrée avec propriétés', () => {
    const entries = [makeEntry()]
    expect(buildPropertyCurves(entries)).toEqual([])
  })
})

// ── calcTopTags ───────────────────────────────────────────────────────────

describe('calcTopTags', () => {
  it('retourne les tags triés par fréquence décroissante', () => {
    const entries = [
      makeEntry({ tags: ['fitness', 'sport', 'nutrition'] }),
      makeEntry({ tags: ['fitness', 'sport'] }),
      makeEntry({ tags: ['fitness'] }),
    ]
    const result = calcTopTags(entries, 10)
    expect(result[0]).toEqual({ tag: 'fitness', count: 3 })
    expect(result[1]).toEqual({ tag: 'sport', count: 2 })
    expect(result[2]).toEqual({ tag: 'nutrition', count: 1 })
  })

  it('limite au top N', () => {
    const entries = [
      makeEntry({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    ]
    const result = calcTopTags(entries, 3)
    expect(result).toHaveLength(3)
  })

  it('retourne tableau vide si aucun tag', () => {
    const entries = [makeEntry()]
    expect(calcTopTags(entries, 10)).toEqual([])
  })

  it('gère les entrées sans tags', () => {
    const entries = [
      makeEntry({ tags: ['fitness'] }),
      makeEntry({ tags: undefined }),
    ]
    const result = calcTopTags(entries, 10)
    expect(result).toHaveLength(1)
  })
})
