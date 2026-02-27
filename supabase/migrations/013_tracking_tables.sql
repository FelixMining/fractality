-- Migration 013: Tracking Tables
-- Story 6.1: Suivis récurrents et réponses
-- Story 6.2: Types d'événements et événements

-- ============================================================
-- tracking_recurrings
-- ============================================================
CREATE TABLE tracking_recurrings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('number', 'boolean', 'choice')),
  unit TEXT,
  choices TEXT[],
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'custom')),
  days_of_week INTEGER[],
  interval_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  routine_id UUID,
  routine_product_id UUID,
  routine_quantity DOUBLE PRECISION,

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tracking_recurrings_user_updated ON tracking_recurrings(user_id, updated_at);
CREATE INDEX idx_tracking_recurrings_is_deleted ON tracking_recurrings(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE tracking_recurrings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracking_recurrings_select" ON tracking_recurrings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "tracking_recurrings_insert" ON tracking_recurrings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracking_recurrings_update" ON tracking_recurrings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracking_recurrings_delete" ON tracking_recurrings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_tracking_recurrings_updated_at
  BEFORE UPDATE ON tracking_recurrings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tracking_recurrings IS 'Définitions de suivis récurrents (poids, sommeil, humeur…)';

-- ============================================================
-- tracking_responses
-- ============================================================
CREATE TABLE tracking_responses (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  recurring_id UUID NOT NULL REFERENCES tracking_recurrings(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  value_number DOUBLE PRECISION,
  value_boolean BOOLEAN,
  value_choice TEXT,
  note TEXT,

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tracking_responses_user_updated ON tracking_responses(user_id, updated_at);
CREATE INDEX idx_tracking_responses_recurring_id ON tracking_responses(recurring_id);
CREATE INDEX idx_tracking_responses_date ON tracking_responses(date);
CREATE INDEX idx_tracking_responses_is_deleted ON tracking_responses(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE tracking_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracking_responses_select" ON tracking_responses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "tracking_responses_insert" ON tracking_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracking_responses_update" ON tracking_responses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracking_responses_delete" ON tracking_responses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_tracking_responses_updated_at
  BEFORE UPDATE ON tracking_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tracking_responses IS 'Réponses aux suivis récurrents (une par jour par suivi)';

-- ============================================================
-- tracking_event_types
-- ============================================================
CREATE TABLE tracking_event_types (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tracking_event_types_user_updated ON tracking_event_types(user_id, updated_at);
CREATE INDEX idx_tracking_event_types_is_deleted ON tracking_event_types(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE tracking_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracking_event_types_select" ON tracking_event_types
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "tracking_event_types_insert" ON tracking_event_types
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracking_event_types_update" ON tracking_event_types
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracking_event_types_delete" ON tracking_event_types
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_tracking_event_types_updated_at
  BEFORE UPDATE ON tracking_event_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tracking_event_types IS 'Types d''événements définis par l''utilisateur (catégories avec icône et couleur)';

-- ============================================================
-- tracking_events
-- ============================================================
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  type_id UUID REFERENCES tracking_event_types(id) ON DELETE SET NULL,
  event_date TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  description TEXT,
  location TEXT,
  image_ids TEXT[],
  tags TEXT[],
  project_id UUID,

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tracking_events_user_updated ON tracking_events(user_id, updated_at);
CREATE INDEX idx_tracking_events_type_id ON tracking_events(type_id);
CREATE INDEX idx_tracking_events_event_date ON tracking_events(event_date);
CREATE INDEX idx_tracking_events_is_deleted ON tracking_events(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracking_events_select" ON tracking_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "tracking_events_insert" ON tracking_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracking_events_update" ON tracking_events
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tracking_events_delete" ON tracking_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_tracking_events_updated_at
  BEFORE UPDATE ON tracking_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tracking_events IS 'Événements ponctuels avec titre, type, date, priorité et tags';
