import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface LocationFieldProps {
  id?: string
  address: string
  onAddressChange: (address: string) => void
  lat?: number
  lng?: number
  onCoordsChange?: (lat: number | undefined, lng: number | undefined) => void
}

export function LocationField({
  id,
  address,
  onAddressChange,
  lat,
  lng,
  onCoordsChange,
}: LocationFieldProps) {
  const [loading, setLoading] = useState(false)

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non disponible sur cet appareil')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        onCoordsChange?.(latitude, longitude)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'fr' } },
          )
          const data = await res.json()
          const addr = data.address ?? {}
          const road =
            addr.house_number && addr.road
              ? `${addr.house_number} ${addr.road}`
              : addr.road
          const city = addr.city || addr.town || addr.village || addr.county
          const parts = [road, city].filter(Boolean)
          const shortAddr = parts.length > 0 ? parts.join(', ') : (data.display_name as string)
          onAddressChange(shortAddr)
        } catch {
          onAddressChange(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        }
        setLoading(false)
      },
      () => {
        toast.error('Localisation refusée ou indisponible')
        setLoading(false)
      },
      { timeout: 10000 },
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          id={id}
          placeholder="Ex: Paris, Clinique Saint-Louis, En ligne…"
          value={address}
          onChange={(e) => {
            onAddressChange(e.target.value)
            if (!e.target.value) {
              onCoordsChange?.(undefined, undefined)
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGeolocate}
          disabled={loading}
          aria-label="Utiliser la localisation actuelle"
          title="Localisation actuelle"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
        </Button>
      </div>
      {lat !== undefined && lng !== undefined && (
        <p className="text-xs text-muted-foreground">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  )
}
