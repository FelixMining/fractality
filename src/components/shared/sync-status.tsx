import { useState, useRef, useEffect } from 'react'
import { RefreshCw, AlertCircle, CheckCircle2, CloudOff, Cloud } from 'lucide-react'
import { useSyncStore } from '@/stores/sync.store'
import { useOnlineStatus } from '@/hooks/use-online-status'

function formatLastSync(ts: string | null): string {
  if (!ts) return 'Jamais synchronisé'
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return "À l'instant"
  if (diff < 3600_000) return `Il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86400_000) return `Il y a ${Math.floor(diff / 3600_000)} h`
  return `Il y a ${Math.floor(diff / 86400_000)} j`
}

export function SyncStatus() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const status = useSyncStore((s) => s.status)
  const lastSyncTimestamp = useSyncStore((s) => s.lastSyncTimestamp)
  const queueSize = useSyncStore((s) => s.queueSize)
  const lastError = useSyncStore((s) => s.lastError)
  const { isOnline } = useOnlineStatus()

  // Fermer en cliquant en dehors
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Icône selon l'état
  const icon = !isOnline ? (
    <CloudOff size={16} className="text-muted-foreground" />
  ) : status === 'syncing' ? (
    <RefreshCw size={16} className="animate-spin text-muted-foreground" />
  ) : status === 'error' ? (
    <AlertCircle size={16} style={{ color: 'var(--color-error)' }} />
  ) : (
    <Cloud size={16} className="text-muted-foreground" />
  )

  // Libellé de statut pour le popup
  const statusLabel = !isOnline
    ? 'Hors ligne'
    : status === 'syncing'
    ? 'Synchronisation…'
    : status === 'error'
    ? 'Erreur de sync'
    : queueSize > 0
    ? `${queueSize} opération${queueSize > 1 ? 's' : ''} en attente`
    : 'Synchronisé'

  const statusColor = !isOnline
    ? 'text-muted-foreground'
    : status === 'error'
    ? 'text-destructive'
    : status === 'syncing'
    ? 'text-muted-foreground'
    : 'text-green-400'

  const StatusIcon = !isOnline
    ? CloudOff
    : status === 'error'
    ? AlertCircle
    : CheckCircle2

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center min-h-[32px] min-w-[32px] rounded-md hover:bg-muted/50 transition-colors"
        aria-label="État de synchronisation"
      >
        {icon}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-lg z-50 p-4 space-y-3"
          role="status"
          aria-live="polite"
        >
          {/* Ligne état */}
          <div className="flex items-center gap-2">
            <StatusIcon size={16} className={statusColor} />
            <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
          </div>

          {/* Erreur */}
          {status === 'error' && lastError && (
            <p className="text-xs text-destructive/80 break-words">{lastError}</p>
          )}

          <div className="border-t border-border" />

          {/* Dernière sauvegarde */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Dernière sync</p>
            <p className="text-sm text-foreground">{formatLastSync(lastSyncTimestamp)}</p>
          </div>

          {/* Connexion */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Connexion</p>
            <span
              className={`text-xs font-medium ${isOnline ? 'text-green-400' : 'text-muted-foreground'}`}
            >
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
