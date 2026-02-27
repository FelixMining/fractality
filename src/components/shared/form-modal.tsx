import { useEffect } from 'react'
import { X } from 'lucide-react'

interface FormModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function FormModal({ open, onClose, title, children }: FormModalProps) {
  // Bloquer le scroll du body quand la modal est ouverte
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-lg px-5 py-6">{children}</div>
      </div>
    </div>
  )
}
