import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { pillars, type Pillar } from '@/lib/navigation'
import { signalCreate } from '@/lib/create-signal'

interface PillarSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PillarSheet({ open, onOpenChange }: PillarSheetProps) {
  const navigate = useNavigate()
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null)

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedPillar(null)
    }
    onOpenChange(isOpen)
  }

  const handleSubTypeClick = (to: string, openCreate?: boolean) => {
    if (openCreate) signalCreate()
    void navigate({ to: to as '/' })
    handleClose(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-bg-secondary px-0 pb-8">
        <SheetHeader className="px-6 pb-4">
          <SheetTitle className="text-left text-base font-semibold text-text-primary">
            {selectedPillar ? (
              <button
                onClick={() => setSelectedPillar(null)}
                className="flex items-center gap-2 text-text-primary"
              >
                <ChevronLeft size={20} />
                {selectedPillar.label}
              </button>
            ) : (
              'Nouvelle entrée'
            )}
          </SheetTitle>
        </SheetHeader>

        {!selectedPillar ? (
          <div className="flex flex-col gap-2 px-4">
            {pillars.map((pillar) => {
              const Icon = pillar.icon
              return (
                <button
                  key={pillar.id}
                  onClick={() => setSelectedPillar(pillar)}
                  className="flex min-h-[56px] items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors hover:bg-bg-tertiary"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--color-${pillar.color}) 15%, transparent)`,
                    }}
                  >
                    <Icon
                      size={22}
                      style={{ color: `var(--color-${pillar.color})` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {pillar.label}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-4">
            {selectedPillar.subTypes.map((sub) => {
              const SubIcon = sub.icon
              return (
                <button
                  key={sub.to}
                  onClick={() => handleSubTypeClick(sub.to, sub.openCreate)}
                  className="flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-bg-tertiary"
                >
                  <SubIcon
                    size={20}
                    style={{ color: `var(--color-${selectedPillar.color})` }}
                  />
                  <span className="text-sm text-text-primary">{sub.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
