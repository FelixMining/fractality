import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EventTypeForm } from './event-type-form'
import { eventTypeRepository } from '@/lib/db/repositories/event.repository'
import type { EventType } from '@/schemas/tracking-event-type.schema'

// Mock du repository
vi.mock('@/lib/db/repositories/event.repository', () => ({
  eventTypeRepository: {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
    restore: vi.fn().mockResolvedValue(undefined),
    getAllSorted: vi.fn().mockResolvedValue([]),
  },
  trackingEventRepository: {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
    getAllByDateDesc: vi.fn().mockResolvedValue([]),
  },
}))

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Mock useUndo
const mockWithUndo = vi.fn()
vi.mock('@/hooks/use-undo', () => ({
  useUndo: () => ({
    withUndo: mockWithUndo,
    undoActions: [],
  }),
}))

const mockExistingType: EventType = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Rendez-vous médical',
  icon: '🏥',
  color: '#3B82F6',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDeleted: false,
  deletedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(eventTypeRepository.create).mockResolvedValue(mockExistingType)
  vi.mocked(eventTypeRepository.update).mockResolvedValue(mockExistingType)
  mockWithUndo.mockImplementation(
    async (_desc: string, action: () => Promise<void>, _undo?: () => Promise<void>) => {
      await action()
    },
  )
})

describe('EventTypeForm — création', () => {
  it('affiche les champs de base', () => {
    render(<EventTypeForm />)
    expect(screen.getByLabelText(/Nom \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Icône/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Couleur/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /créer le type/i })).toBeInTheDocument()
  })

  it('affiche une erreur si le nom est vide à la soumission', async () => {
    render(<EventTypeForm />)
    fireEvent.submit(screen.getByRole('button', { name: /créer le type/i }))
    await waitFor(() => {
      expect(screen.getByText(/Le nom est requis/i)).toBeInTheDocument()
    })
  })

  it('crée un type avec un nom uniquement', async () => {
    const onSuccess = vi.fn()
    render(<EventTypeForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Nom \*/i), {
      target: { value: 'Voyage' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /créer le type/i }))

    await waitFor(() => {
      expect(eventTypeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Voyage' }),
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('crée un type avec nom, icône et couleur', async () => {
    const onSuccess = vi.fn()
    render(<EventTypeForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Nom \*/i), { target: { value: 'Sport' } })
    fireEvent.change(screen.getByLabelText(/Icône/i), { target: { value: '🏃' } })
    fireEvent.change(screen.getByLabelText(/Couleur/i), { target: { value: '#10B981' } })

    fireEvent.submit(screen.getByRole('button', { name: /créer le type/i }))

    await waitFor(() => {
      expect(eventTypeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sport',
          icon: '🏃',
          color: '#10B981',
        }),
      )
    })
  })

  it("affiche une erreur si la couleur n'est pas au format hex valide", async () => {
    render(<EventTypeForm />)

    fireEvent.change(screen.getByLabelText(/Nom \*/i), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText(/Couleur/i), { target: { value: 'rouge' } })

    fireEvent.submit(screen.getByRole('button', { name: /créer le type/i }))

    await waitFor(() => {
      expect(screen.getByText(/Format hex invalide/i)).toBeInTheDocument()
    })
    expect(eventTypeRepository.create).not.toHaveBeenCalled()
  })
})

describe('EventTypeForm — édition', () => {
  it('pré-remplit le formulaire en mode édition', () => {
    render(<EventTypeForm initialData={mockExistingType} />)
    expect(screen.getByDisplayValue('Rendez-vous médical')).toBeInTheDocument()
    expect(screen.getByDisplayValue('🏥')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /modifier le type/i })).toBeInTheDocument()
  })

  it('appelle eventTypeRepository.update en mode édition', async () => {
    const onSuccess = vi.fn()
    render(<EventTypeForm initialData={mockExistingType} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Nom \*/i), {
      target: { value: 'RDV médecin' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /modifier le type/i }))

    await waitFor(() => {
      expect(eventTypeRepository.update).toHaveBeenCalledWith(
        mockExistingType.id,
        expect.objectContaining({ name: 'RDV médecin' }),
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
