-- Migration 012: Stock Tables
-- Story 5.1: Produits en stock
-- Story 5.2: Achats
-- Story 5.3: Routines de consommation

-- ============================================================
-- stock_products
-- ============================================================
CREATE TABLE stock_products (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('liquid', 'quantity', 'bulk')),
  current_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT,
  base_price DOUBLE PRECISION,
  image_id TEXT,

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_stock_products_user_updated ON stock_products(user_id, updated_at);
CREATE INDEX idx_stock_products_is_deleted ON stock_products(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE stock_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_products_select" ON stock_products
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "stock_products_insert" ON stock_products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stock_products_update" ON stock_products
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stock_products_delete" ON stock_products
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_stock_products_updated_at
  BEFORE UPDATE ON stock_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stock_products IS 'Produits suivis en stock (alimentaire, consommables…)';

-- ============================================================
-- stock_purchases
-- ============================================================
CREATE TABLE stock_purchases (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  product_id UUID NOT NULL REFERENCES stock_products(id) ON DELETE CASCADE,
  quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
  price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
  date TEXT NOT NULL,

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_stock_purchases_user_updated ON stock_purchases(user_id, updated_at);
CREATE INDEX idx_stock_purchases_product_id ON stock_purchases(product_id);
CREATE INDEX idx_stock_purchases_is_deleted ON stock_purchases(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_purchases_select" ON stock_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "stock_purchases_insert" ON stock_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stock_purchases_update" ON stock_purchases
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stock_purchases_delete" ON stock_purchases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_stock_purchases_updated_at
  BEFORE UPDATE ON stock_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stock_purchases IS 'Historique des achats par produit';

-- ============================================================
-- stock_routines
-- ============================================================
CREATE TABLE stock_routines (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES stock_products(id) ON DELETE CASCADE,
  quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'custom')),
  days_of_week INTEGER[],
  interval_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  linked_tracking_id UUID,

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_stock_routines_user_updated ON stock_routines(user_id, updated_at);
CREATE INDEX idx_stock_routines_product_id ON stock_routines(product_id);
CREATE INDEX idx_stock_routines_is_deleted ON stock_routines(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE stock_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_routines_select" ON stock_routines
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "stock_routines_insert" ON stock_routines
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stock_routines_update" ON stock_routines
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stock_routines_delete" ON stock_routines
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_stock_routines_updated_at
  BEFORE UPDATE ON stock_routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stock_routines IS 'Routines de consommation automatique liées aux produits';
