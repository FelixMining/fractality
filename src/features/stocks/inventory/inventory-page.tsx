import { useState, useEffect } from 'react'
import { ProductList, countInventoryFilters } from './product-list'
import type { InventoryFilters } from './product-list'
import { ProductForm } from './product-form'
import { ProductDetail } from './product-detail'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/shared/form-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FilterBar } from '@/components/shared/filter-bar'
import { Label } from '@/components/ui/label'
import { useUndo } from '@/hooks/use-undo'
import { stockRepository } from '@/lib/db/repositories/stock.repository'
import { consumeCreate } from '@/lib/create-signal'
import type { StockProductType } from '@/schemas/stock-product.schema'
import { Plus } from 'lucide-react'

const PRODUCT_TYPE_LABELS: Record<StockProductType, string> = {
  liquid: 'Liquide',
  quantity: 'Quantité',
  bulk: 'Vrac',
}

const EMPTY_INVENTORY_FILTERS: InventoryFilters = {
  productTypes: [],
}

type ViewMode = 'list' | 'detail'

export function InventoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [filters, setFilters] = useState<InventoryFilters>(EMPTY_INVENTORY_FILTERS)

  const { withUndo } = useUndo()

  // Ouvrir le formulaire de création si signalé par le bouton +
  useEffect(() => {
    if (consumeCreate()) handleCreateNew()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateNew = () => {
    setEditingProductId(null)
    setFormOpen(true)
  }

  const handleView = (productId: string) => {
    setSelectedProductId(productId)
    setViewMode('detail')
  }

  const handleEdit = (productId?: string) => {
    setEditingProductId(productId ?? selectedProductId)
    setFormOpen(true)
  }

  const handleDeleteRequest = (productId?: string) => {
    setDeletingProductId(productId ?? selectedProductId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingProductId) return

    const product = await stockRepository.getById(deletingProductId)
    if (!product) return

    await withUndo(
      `Produit "${product.name}" supprimé`,
      async () => {
        await stockRepository.softDelete(deletingProductId)
      },
      async () => {
        await stockRepository.restore(deletingProductId)
      },
    )

    setDeleteDialogOpen(false)
    setDeletingProductId(null)

    if (viewMode === 'detail') {
      setViewMode('list')
      setSelectedProductId(null)
    }
  }

  const handleFormSuccess = () => {
    setFormOpen(false)
    setEditingProductId(null)
  }

  const handleFormCancel = () => {
    setFormOpen(false)
    setEditingProductId(null)
  }

  return (
    <>
      {/* CTA */}
      {viewMode === 'list' && (
        <div className="flex justify-center px-4">
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="size-4" />
            Ajouter un produit
          </Button>
        </div>
      )}

      {/* FilterBar */}
      {viewMode === 'list' && (
        <div className="px-4">
          <FilterBar
            activeCount={countInventoryFilters(filters)}
            onReset={() => setFilters(EMPTY_INVENTORY_FILTERS)}
          >
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRODUCT_TYPE_LABELS) as StockProductType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const updated = filters.productTypes.includes(type)
                        ? filters.productTypes.filter((t) => t !== type)
                        : [...filters.productTypes, type]
                      setFilters({ productTypes: updated })
                    }}
                    className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                      filters.productTypes.includes(type)
                        ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                        : 'border-border bg-transparent text-muted-foreground'
                    }`}
                  >
                    {PRODUCT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </FilterBar>
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' && (
        <ProductList
          filters={filters}
          onView={handleView}
          onDelete={handleDeleteRequest}
          onAdd={handleCreateNew}
        />
      )}

      {viewMode === 'detail' && selectedProductId && (
        <div className="px-4">
          <ProductDetail
            productId={selectedProductId}
            onBack={() => {
              setViewMode('list')
              setSelectedProductId(null)
            }}
            onEdit={() => handleEdit()}
            onDelete={() => handleDeleteRequest()}
          />
        </div>
      )}

      {/* Formulaire produit — plein écran */}
      <FormModal
        open={formOpen}
        onClose={handleFormCancel}
        title={editingProductId ? 'Modifier le produit' : 'Nouveau produit'}
      >
        <ProductFormContainer
          productId={editingProductId}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer ce produit ?"
        description="Ce produit sera déplacé dans la corbeille. Vous pourrez le restaurer depuis la corbeille."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

// Sous-composant pour charger les données du produit avant d'afficher le formulaire
interface ProductFormContainerProps {
  productId: string | null
  onSuccess: () => void
  onCancel: () => void
}

function ProductFormContainer({ productId, onSuccess, onCancel }: ProductFormContainerProps) {
  const [initialData, setInitialData] = useState<
    Awaited<ReturnType<typeof stockRepository.getById>> | null
  >(null)
  const [loaded, setLoaded] = useState(!productId)

  // Charger les données du produit si on est en mode édition
  useEffect(() => {
    if (!productId) return
    stockRepository.getById(productId).then((p) => {
      setInitialData(p ?? null)
      setLoaded(true)
    })
  }, [productId])

  if (!loaded) {
    return <p className="text-muted-foreground">Chargement…</p>
  }

  return (
    <ProductForm
      initialData={initialData ?? undefined}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}
