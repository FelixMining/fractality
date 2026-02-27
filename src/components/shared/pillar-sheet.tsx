import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, X } from 'lucide-react'
import { pillars, type Pillar } from '@/lib/navigation'
import { signalCreate } from '@/lib/create-signal'

interface PillarSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PillarSheet({ open, onOpenChange }: PillarSheetProps) {
  const navigate = useNavigate()
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null)

  // Bloquer le scroll du body quand le menu est ouvert
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Réinitialiser le pilier sélectionné à la fermeture
  useEffect(() => {
    if (!open) setSelectedPillar(null)
  }, [open])

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSubTypeClick = (to: string, openCreate?: boolean) => {
    if (openCreate) signalCreate()
    void navigate({ to: to as '/' })
    handleClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        {selectedPillar ? (
          <button
            onClick={() => setSelectedPillar(null)}
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft size={24} />
            <span className="text-base font-medium">{selectedPillar.label}</span>
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Fermer"
        >
          <X size={22} />
        </button>
      </div>

      {/* Contenu centré verticalement */}
      <div className="flex flex-1 flex-col justify-center gap-1 px-4">
        {!selectedPillar ? (
          // Menu principal — 3 piliers
          pillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <button
                key={pillar.id}
                onClick={() => setSelectedPillar(pillar)}
                className="flex items-center gap-6 rounded-2xl px-6 py-7 text-left transition-colors active:bg-accent/60"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-${pillar.color}) 15%, transparent)`,
                  }}
                >
                  <Icon size={32} style={{ color: `var(--color-${pillar.color})` }} />
                </div>
                <span className="text-2xl font-semibold text-foreground">{pillar.label}</span>
              </button>
            )
          })
        ) : (
          // Sous-menu — items du pilier sélectionné
          selectedPillar.subTypes.map((sub) => {
            const SubIcon = sub.icon
            return (
              <button
                key={sub.to}
                onClick={() => handleSubTypeClick(sub.to, sub.openCreate)}
                className="flex items-center gap-6 rounded-2xl px-6 py-6 text-left transition-colors active:bg-accent/60"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-${selectedPillar.color}) 15%, transparent)`,
                  }}
                >
                  <SubIcon size={28} style={{ color: `var(--color-${selectedPillar.color})` }} />
                </div>
                <span className="text-xl font-medium text-foreground">{sub.label}</span>
              </button>
            )
          })
        )}
      </div>

      <div className="h-10" />
    </div>
  )
}
