import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EventForm } from './event-form'
import { trackingEventRepository, eventTypeRepository } from '@/lib/db/repositories/event.repository'
import type { TrackingEvent } from '@/schemas/tracking-event.schema'

// Mock des repositories
vi.mock('@/lib/db/repositories/event.repository', () => ({
  trackingEventRepository: {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
    getAllByDateDesc: vi.fn().mockResolvedValue([]),
    getInRange: vi.fn().mockResolvedValue([]),
  },
  eventTypeRepository: {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
    getAllSorted: vi.fn().mockReturnValue([]),
  },
}))

// Mock dexie-react-hooks
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => unknown) => {
    try {
      return fn()
    } catch {
      return undefined
    }
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

// Mock Select (Radix UI)
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode
    onValueChange?: (v: string) => void
    value?: string
  }) => (
    <select
      data-testid="mock-select"
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <div id={id}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}))

// Mock formatLocalDatetime pour avoir une valeur déterministe
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    formatLocalDatetime: () => '2026-02-22T10:00',
  }
})

import React from 'react'

const mockCreatedEvent: TrackingEvent = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Rendez-vous médecin',
  eventDate: '2026-02-22T14:30',
  priority: 'medium',
  description: 'Bilan annuel',
  location: 'Paris',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDeleted: false,
  deletedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(trackingEventRepository.create).mockResolvedValue(mockCreatedEvent)
  vi.mocked(trackingEventRepository.update).mockResolvedValue(mockCreatedEvent)
  vi.mocked(eventTypeRepository.getAllSorted).mockReturnValue(Promise.resolve([]))
  mockWithUndo.mockImplementation(
    async (_desc: string, action: () => Promise<void>, _undo?: () => Promise<void>) => {
      await action()
    },
  )
})

describe('EventForm — création', () => {
  it('affiche les champs de base pour un nouvel événement', () => {
    render(<EventForm />)
    expect(screen.getByLabelText(/Titre \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date et heure \*/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /créer l'événement/i })).toBeInTheDocument()
  })

  it('affiche une erreur si le titre est vide à la soumission', async () => {
    render(<EventForm />)
    fireEvent.submit(screen.getByRole('button', { name: /créer l'événement/i }))
    await waitFor(() => {
      expect(screen.getByText(/Le titre est requis/i)).toBeInTheDocument()
    })
  })

  it('a la priorité medium par défaut', () => {
    render(<EventForm />)
    // Le bouton "Moyenne" doit avoir la classe de priorité medium active
    const moyenneBtn = screen.getByRole('button', { name: /Moyenne/i })
    expect(moyenneBtn).toBeInTheDocument()
    expect(moyenneBtn.className).toContain('yellow')
  })

  it('crée un événement avec les données saisies', async () => {
    const onSuccess = vi.fn()
    render(<EventForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Titre \*/i), {
      target: { value: 'Rendez-vous cardiologue' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /créer l'événement/i }))

    await waitFor(() => {
      expect(trackingEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Rendez-vous cardiologue',
          priority: 'medium',
        }),
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('configure withUndo avec action et undoAction pour la création', async () => {
    render(<EventForm />)

    fireEvent.change(screen.getByLabelText(/Titre \*/i), {
      target: { value: 'Test undo' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /créer l'événement/i }))

    await waitFor(() => {
      expect(mockWithUndo).toHaveBeenCalledWith(
        expect.stringContaining('créé'),
        expect.any(Function),
        expect.any(Function),
      )
    })
  })

  it('change la priorité quand on clique sur un bouton de priorité', () => {
    render(<EventForm />)
    const hautBtn = screen.getByRole('button', { name: /Haute/i })
    fireEvent.click(hautBtn)
    expect(hautBtn.className).toContain('red')
  })
})

describe('EventForm — édition', () => {
  it('pré-remplit le formulaire en mode édition', () => {
    render(<EventForm initialData={mockCreatedEvent} />)
    expect(screen.getByDisplayValue('Rendez-vous médecin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bilan annuel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /modifier l'événement/i })).toBeInTheDocument()
  })

  it('appelle trackingEventRepository.update en mode édition', async () => {
    const onSuccess = vi.fn()
    render(<EventForm initialData={mockCreatedEvent} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Titre \*/i), {
      target: { value: 'Titre modifié' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /modifier l'événement/i }))

    await waitFor(() => {
      expect(trackingEventRepository.update).toHaveBeenCalledWith(
        mockCreatedEvent.id,
        expect.objectContaining({ title: 'Titre modifié' }),
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
