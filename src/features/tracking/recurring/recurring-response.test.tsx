import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecurringResponse } from './recurring-response'
import { trackingResponseRepository } from '@/lib/db/repositories/tracking.repository'
import type { TrackingRecurring } from '@/schemas/tracking-recurring.schema'
import type { TrackingResponse } from '@/schemas/tracking-response.schema'

// Mock repository
vi.mock('@/lib/db/repositories/tracking.repository', () => ({
  trackingResponseRepository: {
    upsertResponse: vi.fn().mockResolvedValue(undefined),
  },
  isDueOnDate: vi.fn().mockReturnValue(true),
  getScheduledDates: vi.fn().mockReturnValue([]),
}))

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Mock Slider (shadcn/Radix ne fonctionne pas en jsdom)
vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueCommit,
    'aria-label': ariaLabel,
    min,
    max,
    step,
  }: {
    value: number[]
    onValueCommit?: (value: number[]) => void
    'aria-label'?: string
    min?: number
    max?: number
    step?: number
  }) => (
    <input
      type="range"
      aria-label={ariaLabel}
      value={value[0]}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueCommit?.([parseFloat(e.target.value)])}
      data-testid="mock-slider"
    />
  ),
}))

import { toast } from 'sonner'

// Helper pour créer un suivi de test
function makeRecurring(overrides: Partial<TrackingRecurring> = {}): TrackingRecurring {
  return {
    id: 'rec-1',
    userId: 'user-1',
    name: 'Test suivi',
    responseType: 'number',
    recurrenceType: 'daily',
    isActive: true,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    isDeleted: false,
    deletedAt: null,
    ...overrides,
  }
}

const TODAY = '2026-02-10'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecurringResponse — boolean', () => {
  it('appelle upsertResponse avec valueBoolean=true au clic Oui', async () => {
    const recurring = makeRecurring({ responseType: 'boolean' })
    render(<RecurringResponse recurring={recurring} date={TODAY} />)

    fireEvent.click(screen.getByRole('button', { name: /oui/i }))

    await waitFor(() => {
      expect(trackingResponseRepository.upsertResponse).toHaveBeenCalledWith(
        'rec-1',
        TODAY,
        { valueBoolean: true },
      )
    })
  })

  it('appelle upsertResponse avec valueBoolean=false au clic Non', async () => {
    const recurring = makeRecurring({ responseType: 'boolean' })
    render(<RecurringResponse recurring={recurring} date={TODAY} />)

    fireEvent.click(screen.getByRole('button', { name: /non/i }))

    await waitFor(() => {
      expect(trackingResponseRepository.upsertResponse).toHaveBeenCalledWith(
        'rec-1',
        TODAY,
        { valueBoolean: false },
      )
    })
  })

  it('affiche le bouton Oui comme actif si la réponse existante est true', () => {
    const recurring = makeRecurring({ responseType: 'boolean' })
    const existing = {
      id: 'resp-1',
      userId: 'user-1',
      recurringId: 'rec-1',
      date: TODAY,
      valueBoolean: true,
      createdAt: TODAY,
      updatedAt: TODAY,
      isDeleted: false,
      deletedAt: null,
    } as TrackingResponse

    render(<RecurringResponse recurring={recurring} existingResponse={existing} date={TODAY} />)

    const ouiBtn = screen.getByRole('button', { name: /oui/i })
    expect(ouiBtn).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('RecurringResponse — choice', () => {
  it('affiche les chips pour chaque choix', () => {
    const recurring = makeRecurring({
      responseType: 'choice',
      choices: ['Excellent', 'Bien', 'Moyen'],
    })
    render(<RecurringResponse recurring={recurring} date={TODAY} />)

    expect(screen.getByRole('button', { name: /excellent/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bien/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /moyen/i })).toBeInTheDocument()
  })

  it('appelle upsertResponse avec valueChoice au clic sur un chip', async () => {
    const recurring = makeRecurring({
      responseType: 'choice',
      choices: ['Excellent', 'Bien'],
    })
    render(<RecurringResponse recurring={recurring} date={TODAY} />)

    fireEvent.click(screen.getByRole('button', { name: /excellent/i }))

    await waitFor(() => {
      expect(trackingResponseRepository.upsertResponse).toHaveBeenCalledWith(
        'rec-1',
        TODAY,
        { valueChoice: 'Excellent' },
      )
    })
  })
})

describe('RecurringResponse — number (slider)', () => {
  it('affiche le slider avec valeur par défaut 5 si pas de réponse existante', () => {
    const recurring = makeRecurring({ responseType: 'number' })
    render(<RecurringResponse recurring={recurring} date={TODAY} />)

    const slider = screen.getByTestId('mock-slider')
    expect(slider).toHaveValue('5')
  })

  it('affiche la valeur existante dans le slider', () => {
    const recurring = makeRecurring({ responseType: 'number', unit: 'heures' })
    const existing = {
      id: 'resp-2',
      userId: 'user-1',
      recurringId: 'rec-1',
      date: TODAY,
      valueNumber: 7.5,
      createdAt: TODAY,
      updatedAt: TODAY,
      isDeleted: false,
      deletedAt: null,
    } as TrackingResponse

    render(<RecurringResponse recurring={recurring} existingResponse={existing} date={TODAY} />)

    const slider = screen.getByTestId('mock-slider')
    expect(slider).toHaveValue('7.5')
    expect(screen.getByText('7.5 heures')).toBeInTheDocument()
  })

  it('appelle upsertResponse avec valueNumber lors du changement de slider', async () => {
    const recurring = makeRecurring({ responseType: 'number' })
    render(<RecurringResponse recurring={recurring} date={TODAY} />)

    fireEvent.change(screen.getByTestId('mock-slider'), { target: { value: '8' } })

    await waitFor(() => {
      expect(trackingResponseRepository.upsertResponse).toHaveBeenCalledWith(
        'rec-1',
        TODAY,
        { valueNumber: 8 },
      )
    })
  })
})

describe('RecurringResponse — gestion des erreurs', () => {
  it('affiche un toast.error si upsertResponse échoue', async () => {
    vi.mocked(trackingResponseRepository.upsertResponse).mockRejectedValueOnce(
      new Error('DB error'),
    )
    const recurring = makeRecurring({ responseType: 'boolean' })
    render(<RecurringResponse recurring={recurring} date={TODAY} />)

    fireEvent.click(screen.getByRole('button', { name: /oui/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la sauvegarde de la réponse')
    })
  })
})
