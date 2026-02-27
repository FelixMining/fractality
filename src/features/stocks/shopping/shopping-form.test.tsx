import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShoppingForm } from './shopping-form'
import type { StockProduct } from '@/schemas/stock-product.schema'

// Mock des repositories
vi.mock('@/lib/db/repositories/purchase.repository', () => ({
  purchaseRepository: {
    createMultiplePurchases: vi.fn().mockResolvedValue([]),
    softDelete: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/db/repositories/stock.repository', () => ({
  stockRepository: {
    getAllSorted: vi.fn().mockResolvedValue([]),
    adjustStock: vi.fn().mockResolvedValue({}),
  },
}))

// Mock dexie-react-hooks avec vi.fn() pour contrôle par test
const mockUseLiveQuery = vi.fn()
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (...args: unknown[]) => mockUseLiveQuery(...args),
}))

// Mock de sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Mock du hook useUndo
vi.mock('@/hooks/use-undo', () => ({
  useUndo: () => ({
    withUndo: vi.fn().mockImplementation(async (_desc: string, action: () => Promise<void>) => {
      await action()
    }),
    undoActions: [],
  }),
}))

const mockProducts: StockProduct[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Whey protéine',
    productType: 'bulk',
    currentStock: 0,
    unit: 'kg',
    basePrice: 35.0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
    deletedAt: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: "Huile d'olive",
    productType: 'liquid',
    currentStock: 1,
    unit: 'L',
    basePrice: 8.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
    deletedAt: null,
  },
]

describe('ShoppingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Par défaut, simuler des produits disponibles
    mockUseLiveQuery.mockReturnValue(mockProducts)
  })

  it('affiche "Aucun produit" quand l\'inventaire est vide', () => {
    mockUseLiveQuery.mockReturnValue([])
    render(<ShoppingForm />)
    expect(screen.getByText(/Aucun produit dans votre inventaire/i)).toBeTruthy()
  })

  it('affiche un formulaire avec une ligne initiale quand des produits existent', () => {
    render(<ShoppingForm />)
    expect(screen.getByLabelText(/Date de la course/i)).toBeTruthy()
    expect(screen.getByText(/Produits achetés/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ajouter un produit/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Enregistrer la course/i })).toBeTruthy()
  })

  it('pré-remplit le champ date avec la date actuelle', () => {
    render(<ShoppingForm />)
    const dateInput = screen.getByLabelText(/Date de la course/i) as HTMLInputElement
    expect(dateInput.value).toBeTruthy()
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('permet d\'ajouter une ligne supplémentaire', async () => {
    const user = userEvent.setup()
    render(<ShoppingForm />)

    const addBtn = screen.getByRole('button', { name: /Ajouter un produit/i })
    await user.click(addBtn)

    expect(screen.getByText('Produit 1')).toBeTruthy()
    expect(screen.getByText('Produit 2')).toBeTruthy()
  })

  it('affiche une erreur si le formulaire est soumis sans sélectionner de produit', async () => {
    render(<ShoppingForm />)

    const submitBtn = screen.getByRole('button', { name: /Enregistrer la course/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Sélectionnez un produit/i)).toBeTruthy()
    })
  })

  it('affiche une erreur si la quantité est invalide', async () => {
    const user = userEvent.setup()
    render(<ShoppingForm />)

    const qtyInputs = screen.getAllByPlaceholderText(/Ex: 2/i)
    await user.type(qtyInputs[0], 'abc')

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer la course/i }))

    await waitFor(() => {
      expect(screen.getByText(/Quantité invalide/i)).toBeTruthy()
    })
  })

  it('affiche une erreur si le prix est invalide', async () => {
    const user = userEvent.setup()
    render(<ShoppingForm />)

    const priceInputs = screen.getAllByPlaceholderText(/Ex: 29.99/i)
    await user.type(priceInputs[0], 'xyz')

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer la course/i }))

    await waitFor(() => {
      expect(screen.getByText(/Prix invalide/i)).toBeTruthy()
    })
  })

  it('appelle onCancel quand on clique Annuler', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ShoppingForm onCancel={onCancel} />)

    const cancelBtn = screen.getByRole('button', { name: /Annuler/i })
    await user.click(cancelBtn)

    expect(onCancel).toHaveBeenCalled()
  })

  it('affiche le chargement quand les produits ne sont pas encore disponibles', () => {
    mockUseLiveQuery.mockReturnValue(undefined)
    render(<ShoppingForm />)
    expect(screen.getByText(/Chargement des produits/i)).toBeTruthy()
  })

  it('affiche le total estimé quand des quantités et prix sont saisis', async () => {
    const user = userEvent.setup()
    render(<ShoppingForm />)

    const qtyInputs = screen.getAllByPlaceholderText(/Ex: 2/i)
    const priceInputs = screen.getAllByPlaceholderText(/Ex: 29.99/i)
    await user.type(qtyInputs[0], '2')
    await user.type(priceInputs[0], '10')

    // Le total (2 × 10 = 20 €) devrait apparaître
    await waitFor(() => {
      expect(screen.getByText(/20\.00 €/i)).toBeTruthy()
    })
  })
})
