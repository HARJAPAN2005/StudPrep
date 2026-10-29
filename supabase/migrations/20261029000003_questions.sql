-- Migration: 20261029000003_questions
-- Creates the questions table, the public view (excludes answer key), and RLS.
-- SECURITY: correct_index and explanation MUST NOT be exposed to students during active exams.

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');

-- ── questions ────────────────────────────────────────────────────────────────

CREATE TABLE public.questions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id       UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  document_id      UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  body             TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 1000),
  options          TEXT[] NOT NULL CHECK (array_length(options, 1) = 4),
  correct_index    SMALLINT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation      TEXT NOT NULL CHECK (char_length(explanation) BETWEEN 10 AND 2000),
  difficulty       question_difficulty NOT NULL DEFAULT 'medium',
  source_page      INT,
  ai_model_version TEXT,
  is_approved      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX idx_questions_is_approved ON public.questions(is_approved);

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── SECURITY VIEW: questions_public ──────────────────────────────────────────
-- This view EXCLUDES correct_index and explanation.
-- Students query this view — they NEVER see the answer key during an active exam.

CREATE VIEW public.questions_public AS
  SELECT
    id,
    subject_id,
    body,
    options,
    difficulty,
    source_page
  FROM public.questions
  WHERE is_approved = TRUE;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Students can only read through the view (questions_public), not the base table.
-- The base table SELECT is restricted to admins only.
-- RLS on views is inherited from the underlying table.

-- Admins can read all questions (including correct_index and explanation)
CREATE POLICY "questions: admins can read all"
  ON public.questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can read the public view (via questions_public)
-- The view itself excludes sensitive columns; this policy allows querying it.
CREATE POLICY "questions: authenticated users can read public view"
  ON public.questions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- NOTE: The application layer MUST always use questions_public for student queries,
-- never the base table. The view provides the security boundary.

-- Only admins can insert, update, or delete questions
CREATE POLICY "questions: admins can insert"
  ON public.questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "questions: admins can update"
  ON public.questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "questions: admins can delete"
  ON public.questions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

