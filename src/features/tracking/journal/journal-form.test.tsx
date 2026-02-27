import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JournalForm } from './journal-form'
import { journalEntryRepository } from '@/lib/db/repositories/journal.repository'
import type { JournalEntry } from '@/schemas/journal-entry.schema'

// Mock du repository
vi.mock('@/lib/db/repositories/journal.repository', () => ({
  journalEntryRepository: {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
    restore: vi.fn().mockResolvedValue(undefined),
    getAllTags: vi.fn().mockResolvedValue([]),
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

// Mock formatLocalDatetime pour une valeur déterministe
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    formatLocalDatetime: () => '2026-02-22T10:00',
  }
})

const mockCreatedEntry: JournalEntry = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  content: 'Bonne journée productive.',
  entryDate: '2026-02-22T10:00',
  mood: 8,
  motivation: 7,
  energy: undefined,
  tags: ['travail', 'focus'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDeleted: false,
  deletedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(journalEntryRepository.create).mockResolvedValue(mockCreatedEntry)
  vi.mocked(journalEntryRepository.update).mockResolvedValue(mockCreatedEntry)
  vi.mocked(journalEntryRepository.getAllTags).mockResolvedValue([])
  mockWithUndo.mockImplementation(
    async (_desc: string, action: () => Promise<void>, _undo?: () => Promise<void>) => {
      await action()
    },
  )
})

describe('JournalForm — création', () => {
  it('affiche les champs de base pour une nouvelle entrée', () => {
    render(<JournalForm />)
    expect(screen.getByLabelText(/Date et heure \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Journal \*/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Créer/i })).toBeInTheDocument()
  })

  it('a la date du jour comme valeur par défaut', () => {
    render(<JournalForm />)
    expect(screen.getByLabelText(/Date et heure \*/i)).toHaveValue('2026-02-22T10:00')
  })

  it('affiche une erreur si le contenu est vide à la soumission', async () => {
    render(<JournalForm />)
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }))
    await waitFor(() => {
      expect(screen.getByText(/Le contenu est requis/i)).toBeInTheDocument()
    })
  })

  it('crée une entrée avec le contenu saisi', async () => {
    const onSuccess = vi.fn()
    render(<JournalForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Journal \*/i), {
      target: { value: 'Ma première entrée de test.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }))

    await waitFor(() => {
      expect(journalEntryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Ma première entrée de test.' }),
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('configure withUndo avec action et undoAction pour la création', async () => {
    render(<JournalForm />)

    fireEvent.change(screen.getByLabelText(/Journal \*/i), {
      target: { value: 'Test undo create' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }))

    await waitFor(() => {
      expect(mockWithUndo).toHaveBeenCalledWith(
        expect.stringContaining('créée'),
        expect.any(Function),
        expect.any(Function),
      )
    })
  })

  it('ne soumet pas si le contenu est vide après espace seul', async () => {
    render(<JournalForm />)

    fireEvent.change(screen.getByLabelText(/Journal \*/i), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }))

    await waitFor(() => {
      expect(journalEntryRepository.create).not.toHaveBeenCalled()
      expect(screen.getByText(/Le contenu est requis/i)).toBeInTheDocument()
    })
  })
})

describe('JournalForm — édition', () => {
  it('pré-remplit le formulaire en mode édition', () => {
    render(<JournalForm initialData={mockCreatedEntry} />)
    expect(screen.getByDisplayValue('Bonne journée productive.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Modifier/i })).toBeInTheDocument()
  })

  it('pré-remplit la date en mode édition', () => {
    render(<JournalForm initialData={mockCreatedEntry} />)
    expect(screen.getByLabelText(/Date et heure \*/i)).toHaveValue('2026-02-22T10:00')
  })

  it('appelle journalEntryRepository.update en mode édition', async () => {
    const onSuccess = vi.fn()
    render(<JournalForm initialData={mockCreatedEntry} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Journal \*/i), {
      target: { value: 'Contenu modifié.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Modifier/i }))

    await waitFor(() => {
      expect(journalEntryRepository.update).toHaveBeenCalledWith(
        mockCreatedEntry.id,
        expect.objectContaining({ content: 'Contenu modifié.' }),
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('configure withUndo avec undoAction pour l\'édition', async () => {
    render(<JournalForm initialData={mockCreatedEntry} />)

    fireEvent.change(screen.getByLabelText(/Journal \*/i), {
      target: { value: 'Test undo update' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Modifier/i }))

    await waitFor(() => {
      expect(mockWithUndo).toHaveBeenCalledWith(
        expect.stringContaining('modifiée'),
        expect.any(Function),
        expect.any(Function),
      )
    })
  })
})

describe('JournalForm — tags', () => {
  it('affiche le champ de saisie de tags', () => {
    render(<JournalForm />)
    expect(screen.getByLabelText(/Saisir un tag/i)).toBeInTheDocument()
  })

  it('ajoute un tag avec la touche Entrée', async () => {
    render(<JournalForm />)
    const tagInput = screen.getByLabelText(/Saisir un tag/i)

    fireEvent.change(tagInput, { target: { value: 'sport' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('sport')).toBeInTheDocument()
    })
  })

  it('ajoute un tag avec la touche virgule', async () => {
    render(<JournalForm />)
    const tagInput = screen.getByLabelText(/Saisir un tag/i)

    fireEvent.change(tagInput, { target: { value: 'lecture' } })
    fireEvent.keyDown(tagInput, { key: ',' })

    await waitFor(() => {
      expect(screen.getByText('lecture')).toBeInTheDocument()
    })
  })

  it('supprime un tag via le bouton ×', async () => {
    render(<JournalForm />)
    const tagInput = screen.getByLabelText(/Saisir un tag/i)

    // Ajouter un tag
    fireEvent.change(tagInput, { target: { value: 'yoga' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText('yoga')).toBeInTheDocument())

    // Supprimer le tag
    const removeBtn = screen.getByLabelText(/Supprimer le tag yoga/i)
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByText('yoga')).not.toBeInTheDocument()
    })
  })

  it("n'ajoute pas un tag en doublon", async () => {
    render(<JournalForm />)
    const tagInput = screen.getByLabelText(/Saisir un tag/i)

    fireEvent.change(tagInput, { target: { value: 'sport' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    fireEvent.change(tagInput, { target: { value: 'sport' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      const tags = screen.getAllByText('sport')
      expect(tags).toHaveLength(1)
    })
  })
})

describe('JournalForm — sliders', () => {
  it('affiche les boutons "Ajouter" pour les propriétés inactives', () => {
    render(<JournalForm />)
    const addButtons = screen.getAllByText('Ajouter')
    expect(addButtons).toHaveLength(3) // mood, motivation, énergie
  })

  it('active le slider humeur au clic sur "Ajouter"', async () => {
    render(<JournalForm />)
    const addButtons = screen.getAllByText('Ajouter')
    fireEvent.click(addButtons[0]) // Premier = Humeur

    await waitFor(() => {
      expect(screen.getByLabelText(/Humeur \d+\/10/i)).toBeInTheDocument()
    })
  })

  it('pré-active les sliders en mode édition quand les valeurs existent', () => {
    render(<JournalForm initialData={mockCreatedEntry} />)
    // mood=8 et motivation=7 doivent être actifs (slider visible)
    expect(screen.getByLabelText(/Humeur \d+\/10/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Motivation \d+\/10/i)).toBeInTheDocument()
  })
})
