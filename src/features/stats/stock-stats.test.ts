import { describe, it, expect } from 'vitest'
import type { StockPurchase } from '@/schemas/stock-purchase.schema'
import type { StockProduct } from '@/schemas/stock-product.schema'
import type { StockRoutine } from '@/schemas/stock-routine.schema'
import {
  groupPurchasesByMonth,
  groupPurchasesByWeek,
  groupPurchasesByProduct,
  calcAvgPriceByProduct,
  buildDaysRemainingList,
  calcTotalSpent,
  filterPurchasesByPeriod,
} from './stock-stats'

// ── Helpers ───────────────────────────────────────────────────────────────

function makePurchase(overrides: Partial<StockPurchase> = {}): StockPurchase {
  return {
    id: crypto.randomUUID(),
    userId: 'test-user-id',
    productId: 'product-1',
    quantity: 1,
    price: 10,
    date: '2026-01-15',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    isDeleted: false,
    ...overrides,
  }
}

function makeProduct(overrides: Partial<StockProduct> = {}): StockProduct {
  return {
    id: 'product-1',
    userId: 'test-user-id',
    name: 'Protéines Whey',
    productType: 'quantity',
    currentStock: 500,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isDeleted: false,
    ...overrides,
  }
}

function makeRoutine(overrides: Partial<StockRoutine> = {}): StockRoutine {
  return {
    id: crypto.randomUUID(),
    userId: 'test-user-id',
    name: 'Routine test',
    productId: 'product-1',
    quantity: 30,
    recurrenceType: 'daily',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isDeleted: false,
    ...overrides,
  }
}

// ── filterPurchasesByPeriod ────────────────────────────────────────────────

describe('filterPurchasesByPeriod', () => {
  it('retourne les achats dans la période', () => {
    const purchases = [
      makePurchase({ date: '2026-01-10' }),
      makePurchase({ date: '2026-01-20' }),
      makePurchase({ date: '2026-02-05' }),
    ]
    const result = filterPurchasesByPeriod(purchases, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.date)).toEqual(['2026-01-10', '2026-01-20'])
  })

  it('inclut les bornes', () => {
    const purchases = [
      makePurchase({ date: '2026-01-01' }),
      makePurchase({ date: '2026-01-31' }),
    ]
    const result = filterPurchasesByPeriod(purchases, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(2)
  })

  it('retourne tableau vide si aucun achat dans la période', () => {
    const purchases = [makePurchase({ date: '2025-12-01' })]
    const result = filterPurchasesByPeriod(purchases, '2026-01-01', '2026-01-31')
    expect(result).toHaveLength(0)
  })
})

// ── groupPurchasesByMonth ─────────────────────────────────────────────────

describe('groupPurchasesByMonth', () => {
  it('regroupe plusieurs achats du même mois', () => {
    const purchases = [
      makePurchase({ date: '2026-01-10', price: 15 }),
      makePurchase({ date: '2026-01-20', price: 25 }),
      makePurchase({ date: '2026-02-05', price: 10 }),
    ]
    const result = groupPurchasesByMonth(purchases)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: '2026-01', montant: 40 })
    expect(result[1]).toEqual({ date: '2026-02', montant: 10 })
  })

  it('retourne tableau vide pour entrée vide', () => {
    expect(groupPurchasesByMonth([])).toEqual([])
  })

  it('trie les mois chronologiquement', () => {
    const purchases = [
      makePurchase({ date: '2026-03-01', price: 5 }),
      makePurchase({ date: '2026-01-01', price: 5 }),
      makePurchase({ date: '2026-02-01', price: 5 }),
    ]
    const result = groupPurchasesByMonth(purchases)
    expect(result.map((r) => r.date)).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('arrondit les montants à 2 décimales', () => {
    const purchases = [
      makePurchase({ date: '2026-01-01', price: 3.333 }),
      makePurchase({ date: '2026-01-02', price: 3.333 }),
    ]
    const result = groupPurchasesByMonth(purchases)
    expect(result[0].montant).toBe(6.67)
  })
})

// ── groupPurchasesByWeek ──────────────────────────────────────────────────

describe('groupPurchasesByWeek', () => {
  it('regroupe les achats de la même semaine', () => {
    const purchases = [
      makePurchase({ date: '2026-01-05', price: 10 }), // lundi
      makePurchase({ date: '2026-01-07', price: 20 }), // mercredi (même semaine)
      makePurchase({ date: '2026-01-12', price: 15 }), // lundi suivant
    ]
    const result = groupPurchasesByWeek(purchases)
    expect(result).toHaveLength(2)
    expect(result[0].montant).toBe(30)
    expect(result[1].montant).toBe(15)
  })

  it('retourne tableau vide pour entrée vide', () => {
    expect(groupPurchasesByWeek([])).toEqual([])
  })
})

// ── groupPurchasesByProduct ───────────────────────────────────────────────

describe('groupPurchasesByProduct', () => {
  it('regroupe les dépenses par produit', () => {
    const p1 = makeProduct({ id: 'p1', name: 'Whey' })
    const p2 = makeProduct({ id: 'p2', name: 'Créatine' })
    const purchases = [
      makePurchase({ productId: 'p1', price: 30 }),
      makePurchase({ productId: 'p1', price: 20 }),
      makePurchase({ productId: 'p2', price: 10 }),
    ]
    const result = groupPurchasesByProduct(purchases, [p1, p2])
    expect(result).toHaveLength(2)
    const whey = result.find((r) => r.name === 'Whey')
    expect(whey?.value).toBe(50)
    const creatine = result.find((r) => r.name === 'Créatine')
    expect(creatine?.value).toBe(10)
  })

  it('retourne tableau vide si pas d\'achats', () => {
    expect(groupPurchasesByProduct([], [])).toEqual([])
  })

  it('gère les produits inconnus (supprimés)', () => {
    const purchases = [makePurchase({ productId: 'inconnu-id', price: 10 })]
    const result = groupPurchasesByProduct(purchases, [])
    expect(result[0].name).toBe('Produit inconnu')
    expect(result[0].value).toBe(10)
  })
})

// ── calcAvgPriceByProduct ─────────────────────────────────────────────────

describe('calcAvgPriceByProduct', () => {
  it('calcule le prix moyen par produit', () => {
    const p1 = makeProduct({ id: 'p1', name: 'Whey' })
    const purchases = [
      makePurchase({ productId: 'p1', price: 30, quantity: 1 }),
      makePurchase({ productId: 'p1', price: 40, quantity: 2 }),
    ]
    const result = calcAvgPriceByProduct(purchases, [p1])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Whey')
    expect(result[0].avgPrice).toBe(35) // (30 + 40) / 2 = 35
  })

  it('retourne tableau vide si pas d\'achats', () => {
    expect(calcAvgPriceByProduct([], [])).toEqual([])
  })
})

// ── buildDaysRemainingList ────────────────────────────────────────────────

describe('buildDaysRemainingList', () => {
  it('calcule les jours restants pour les produits avec routines', () => {
    const product = makeProduct({ id: 'p1', currentStock: 300 })
    const routine = makeRoutine({ productId: 'p1', quantity: 30, recurrenceType: 'daily' }) // 30/jour
    const result = buildDaysRemainingList([product], [routine])
    expect(result).toHaveLength(1)
    expect(result[0].productName).toBe('Protéines Whey')
    expect(result[0].daysRemaining).toBe(10) // 300 / 30 = 10
  })

  it('exclut les produits sans routine active', () => {
    const product = makeProduct({ id: 'p1', currentStock: 100 })
    const result = buildDaysRemainingList([product], [])
    expect(result).toHaveLength(0)
  })

  it('trie par jours restants croissant', () => {
    const p1 = makeProduct({ id: 'p1', name: 'P1', currentStock: 100 })
    const p2 = makeProduct({ id: 'p2', name: 'P2', currentStock: 500 })
    const r1 = makeRoutine({ productId: 'p1', quantity: 50, recurrenceType: 'daily' }) // 2 jours
    const r2 = makeRoutine({ productId: 'p2', quantity: 50, recurrenceType: 'daily' }) // 10 jours
    const result = buildDaysRemainingList([p1, p2], [r1, r2])
    expect(result[0].productName).toBe('P1')
    expect(result[1].productName).toBe('P2')
  })
})

// ── calcTotalSpent ────────────────────────────────────────────────────────

describe('calcTotalSpent', () => {
  it('calcule le total des dépenses', () => {
    const purchases = [
      makePurchase({ price: 10 }),
      makePurchase({ price: 25.5 }),
      makePurchase({ price: 14.5 }),
    ]
    expect(calcTotalSpent(purchases)).toBe(50)
  })

  it('retourne 0 pour tableau vide', () => {
    expect(calcTotalSpent([])).toBe(0)
  })
})
