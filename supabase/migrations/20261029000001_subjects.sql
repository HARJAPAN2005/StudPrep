-- Migration: 20261029000001_subjects
-- Creates the subjects table with RLS policies.

-- ── subjects ─────────────────────────────────────────────────────────────────

CREATE TABLE public.subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  color       TEXT DEFAULT '#6366f1', -- Tailwind indigo-500 hex
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subjects_code ON public.subjects(code);
CREATE INDEX idx_subjects_is_archived ON public.subjects(is_archived);

CREATE TRIGGER subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active subjects
CREATE POLICY "subjects: authenticated users can read active"
  ON public.subjects
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_archived = FALSE);

-- Admins can read all subjects (including archived)
CREATE POLICY "subjects: admins can read all"
  ON public.subjects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert subjects
CREATE POLICY "subjects: admins can insert"
  ON public.subjects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update subjects
CREATE POLICY "subjects: admins can update"
  ON public.subjects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins use soft delete (set is_archived = TRUE), no hard DELETE policy needed

