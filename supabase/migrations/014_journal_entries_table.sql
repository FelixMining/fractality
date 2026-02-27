-- Migration 014: Journal Entries Table
-- Story 6.3: Journal personnel avec propriétés chiffrées et tags

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 10),
  motivation INTEGER CHECK (motivation >= 1 AND motivation <= 10),
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  tags TEXT[],
  media_ids TEXT[],
  project_id UUID,

  -- BaseEntity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_journal_entries_user_updated ON journal_entries(user_id, updated_at);
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_is_deleted ON journal_entries(is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_select" ON journal_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "journal_entries_insert" ON journal_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "journal_entries_update" ON journal_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "journal_entries_delete" ON journal_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE journal_entries IS 'Entrées de journal personnel avec humeur, motivation, énergie et tags';
COMMENT ON COLUMN journal_entries.mood IS 'Humeur de 1 (très mauvaise) à 10 (excellente)';
COMMENT ON COLUMN journal_entries.motivation IS 'Motivation de 1 à 10';
COMMENT ON COLUMN journal_entries.energy IS 'Niveau d''énergie de 1 à 10';
