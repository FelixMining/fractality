import { describe, it, expect } from 'vitest'
import {
  buildDayCountMap,
  getIntensityLevel,
  getBestStreak,
  calcAvgEntriesPerDay,
  buildGridDays,
  getCellColor,
} from './habits-stats'

// ---------------------------------------------------------------------------
// buildDayCountMap
// ---------------------------------------------------------------------------

describe('buildDayCountMap', () => {
  it('retourne une map vide pour un tableau vide', () => {
    const map = buildDayCountMap([])
    expect(map.size).toBe(0)
  })

  it('compte correctement une seule date', () => {
    const map = buildDayCountMap(['2026-01-01'])
    expect(map.get('2026-01-01')).toBe(1)
  })

  it('cumule les occurrences de dates dupliquées', () => {
    const map = buildDayCountMap(['2026-01-01', '2026-01-01', '2026-01-02'])
    expect(map.get('2026-01-01')).toBe(2)
    expect(map.get('2026-01-02')).toBe(1)
  })

  it('gère plusieurs dates dupliquées (5 fois la même)', () => {
    const dates = Array(5).fill('2026-02-10')
    const map = buildDayCountMap(dates)
    expect(map.get('2026-02-10')).toBe(5)
    expect(map.size).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// getIntensityLevel
// ---------------------------------------------------------------------------

describe('getIntensityLevel', () => {
  it('niveau 0 pour count = 0', () => {
    expect(getIntensityLevel(0)).toBe(0)
  })

  it('niveau 1 pour count = 1', () => {
    expect(getIntensityLevel(1)).toBe(1)
  })

  it('niveau 1 pour count = 2', () => {
    expect(getIntensityLevel(2)).toBe(1)
  })

  it('niveau 2 pour count = 3', () => {
    expect(getIntensityLevel(3)).toBe(2)
  })

  it('niveau 2 pour count = 5', () => {
    expect(getIntensityLevel(5)).toBe(2)
  })

  it('niveau 3 pour count = 6', () => {
    expect(getIntensityLevel(6)).toBe(3)
  })

  it('niveau 3 pour count = 10', () => {
    expect(getIntensityLevel(10)).toBe(3)
  })

  it('niveau 4 pour count = 11', () => {
    expect(getIntensityLevel(11)).toBe(4)
  })

  it('niveau 4 pour count très élevé', () => {
    expect(getIntensityLevel(100)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// getBestStreak
// ---------------------------------------------------------------------------

describe('getBestStreak', () => {
  it('retourne 0 pour une map vide', () => {
    const map = new Map<string, number>()
    expect(getBestStreak(map)).toBe(0)
  })

  it('retourne 0 si aucun jour actif (toutes valeurs à 0)', () => {
    const map = new Map([['2026-01-01', 0]])
    expect(getBestStreak(map)).toBe(0)
  })

  it('streak de 1 pour un seul jour actif', () => {
    const map = new Map([['2026-01-01', 2]])
    expect(getBestStreak(map)).toBe(1)
  })

  it('calcule un streak simple de 3 jours consécutifs', () => {
    const map = new Map([
      ['2026-01-01', 1],
      ['2026-01-02', 3],
      ['2026-01-03', 2],
    ])
    expect(getBestStreak(map)).toBe(3)
  })

  it('détecte le meilleur streak parmi plusieurs séries', () => {
    const map = new Map([
      ['2026-01-01', 1],
      ['2026-01-02', 1],
      // rupture le 3
      ['2026-01-04', 1],
      ['2026-01-05', 1],
      ['2026-01-06', 1],
      ['2026-01-07', 1],
    ])
    expect(getBestStreak(map)).toBe(4)
  })

  it('retourne 1 pour des jours non contigus', () => {
    const map = new Map([
      ['2026-01-01', 1],
      ['2026-01-03', 1],
      ['2026-01-05', 1],
    ])
    expect(getBestStreak(map)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// calcAvgEntriesPerDay
// ---------------------------------------------------------------------------

describe('calcAvgEntriesPerDay', () => {
  it('retourne 0 pour une map vide', () => {
    expect(calcAvgEntriesPerDay(new Map())).toBe(0)
  })

  it('retourne 0 si toutes les valeurs sont 0', () => {
    const map = new Map([['2026-01-01', 0]])
    expect(calcAvgEntriesPerDay(map)).toBe(0)
  })

  it('calcule la moyenne correcte pour plusieurs jours', () => {
    const map = new Map([
      ['2026-01-01', 2],
      ['2026-01-02', 4],
      ['2026-01-03', 6],
    ])
    expect(calcAvgEntriesPerDay(map)).toBe(4)
  })

  it('arrondit correctement à 1 décimale', () => {
    const map = new Map([
      ['2026-01-01', 1],
      ['2026-01-02', 2],
    ])
    expect(calcAvgEntriesPerDay(map)).toBe(1.5)
  })
})

// ---------------------------------------------------------------------------
// buildGridDays
// ---------------------------------------------------------------------------

describe('buildGridDays', () => {
  it('la longueur est un multiple de 7', () => {
    const days = buildGridDays('2026-02-25')
    expect(days.length % 7).toBe(0)
  })

  it('commence un lundi (getDay() === 1)', () => {
    const days = buildGridDays('2026-02-25')
    const firstDate = new Date(days[0] + 'T12:00:00')
    expect(firstDate.getDay()).toBe(1) // 1 = lundi
  })

  it('contient aujourd\'hui', () => {
    const today = '2026-02-25'
    const days = buildGridDays(today)
    expect(days).toContain(today)
  })

  it('ne contient pas de dates futures (after today)', () => {
    const today = '2026-02-25'
    const days = buildGridDays(today)
    // Le dernier jour de la grille peut être le dimanche de la semaine courante → ≥ today
    // mais on vérifie que la grille ne va pas bien au-delà (max 6 jours futurs)
    const lastDay = days[days.length - 1]
    const diff =
      (new Date(lastDay + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
    expect(diff).toBeLessThanOrEqual(6)
  })

  it('couvre approximativement 365 jours (entre 365 et 371)', () => {
    const days = buildGridDays('2026-02-25')
    expect(days.length).toBeGreaterThanOrEqual(365)
    expect(days.length).toBeLessThanOrEqual(371)
  })
})

// ---------------------------------------------------------------------------
// getCellColor
// ---------------------------------------------------------------------------

describe('getCellColor', () => {
  it('retourne transparent pour count = 0', () => {
    expect(getCellColor(0, 'global')).toBe('transparent')
  })

  it('retourne rgba violet 25% pour count = 1 global', () => {
    expect(getCellColor(1, 'global')).toBe('rgba(139, 92, 246, 0.25)')
  })

  it('retourne rgba bleu 25% pour count = 1 sessions', () => {
    expect(getCellColor(1, 'sessions')).toBe('rgba(59, 130, 246, 0.25)')
  })

  it('retourne rgba vert 100% pour count = 11 stocks', () => {
    expect(getCellColor(11, 'stocks')).toBe('rgba(16, 185, 129, 1)')
  })
})
