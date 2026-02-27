import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/database'
import { StockAdjustment } from './stock-adjustment'
import { DaysRemaining } from '@/features/stocks/routines/days-remaining'
import { routineRepository } from '@/lib/db/repositories/routine.repository'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Pencil, Trash2, Package } from 'lucide-react'
import type { StockProductType } from '@/schemas/stock-product.schema'

const TYPE_LABELS: Record<StockProductType, string> = {
  liquid: 'Liquide',
  quantity: 'Quantité',
  bulk: 'Vrac',
}

interface ProductDetailProps {
  productId: string
  onBack?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function ProductDetail({ productId, onBack, onEdit, onDelete }: ProductDetailProps) {
  // undefined = chargement, null = introuvable/supprimé, StockProduct = trouvé
  const result = useLiveQuery(async () => {
    const p = await db.stock_products.get(productId)
    if (!p || p.isDeleted) return null
    return p
  }, [productId])

  const routines = useLiveQuery(
    () => routineRepository.getByProductId(productId),
    [productId],
  )

  if (result === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (result === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Produit introuvable.</p>
      </div>
    )
  }

  const product = result

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="Retour">
              <ArrowLeft className="size-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <Badge className="mt-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {TYPE_LABELS[product.productType]}
            </Badge>
          </div>
        </div>

        <div className="flex gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Modifier">
              <Pencil className="size-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Supprimer">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Infos produit */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Stock actuel</p>
            <p className="text-xl font-bold">
              {product.currentStock}
              {product.unit && (
                <span className="ml-1 text-base text-muted-foreground">{product.unit}</span>
              )}
            </p>
            {product.currentStock === 0 && (
              <Badge variant="destructive" className="mt-1">Épuisé</Badge>
            )}
          </div>

          {product.basePrice !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground">Prix de base</p>
              <p className="text-xl font-bold">{product.basePrice.toFixed(2)} €</p>
            </div>
          )}
        </div>

        {product.unit && (
          <div>
            <p className="text-sm text-muted-foreground">Unité</p>
            <p className="font-medium">{product.unit}</p>
          </div>
        )}
      </Card>

      {/* Ajustement manuel du stock */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Ajuster le stock</h3>
        <StockAdjustment product={product} />
      </Card>

      {/* Estimation jours restants */}
      {routines && routines.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Estimation</h3>
          <DaysRemaining
            currentStock={product.currentStock}
            unit={product.unit}
            routines={routines}
          />
        </Card>
      )}

      {/* Historique des mouvements */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Historique des mouvements</h3>
        <Separator />
        <div className="flex flex-col items-center gap-2 py-4">
          <Package className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Aucun mouvement enregistré. Les achats et ajustements apparaîtront ici.
          </p>
        </div>
      </Card>
    </div>
  )
}
