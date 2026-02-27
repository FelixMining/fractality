-- Migration 011: Cardio Sessions Table
-- Story 4.1: Séances cardio avec import GPX optionnel

CREATE TABLE cardio_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- CommonProperties
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  location TEXT,
  images TEXT[],
  tags TEXT[],
  project_id UUID,

  -- Cardio specific
  activity_type TEXT NOT NULL CHECK (activity_type IN ('running', 'cycling', 'swimming', 'hiking', 'walking', 'other')),
  duration INTEGER NOT NULL CHECK (duration > 0),
  distance DOUBLE PRECISION,
  avg_speed DOUBLE PRECISION,
  max_speed DOUBLE PRECISION,
  elevation_gain DOUBLE PRECISION,
  elevation_loss DOUBLE PRECISION,
  avg_pace DOUBLE PRECISION,
  start_location TEXT,
  input_mode TEXT NOT NULL CHECK (input_mode IN ('gpx', 'manual')),

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_cardio_sessions_user_updated ON cardio_sessions(user_id, updated_at);
CREATE INDEX idx_cardio_sessions_is_deleted ON cardio_sessions(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cardio_sessions_select" ON cardio_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cardio_sessions_insert" ON cardio_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cardio_sessions_update" ON cardio_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cardio_sessions_delete" ON cardio_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_cardio_sessions_updated_at
  BEFORE UPDATE ON cardio_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cardio_sessions IS 'Séances cardio (course, vélo, natation…) avec métriques et import GPX';
COMMENT ON COLUMN cardio_sessions.duration IS 'Durée en secondes';
COMMENT ON COLUMN cardio_sessions.distance IS 'Distance en mètres';
COMMENT ON COLUMN cardio_sessions.avg_speed IS 'Vitesse moyenne en km/h';
COMMENT ON COLUMN cardio_sessions.max_speed IS 'Vitesse max en km/h';
COMMENT ON COLUMN cardio_sessions.elevation_gain IS 'Dénivelé positif en mètres';
COMMENT ON COLUMN cardio_sessions.elevation_loss IS 'Dénivelé négatif en mètres';
COMMENT ON COLUMN cardio_sessions.avg_pace IS 'Allure moyenne en s/km';
