-- ==============================================================================
-- Migration: 20261030000003_grading_and_results.sql
-- Description: Phase 8 - Deterministic Server-Side Grading, Detailed Question
--              Analytics, Topic Performance Breakdown, and Question Reporting.
-- ==============================================================================

-- ── 1. Enhance exam_attempts with detailed grading analytics ─────────────────

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS accuracy NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS section_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS topic_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS detailed_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attempt_number INT NOT NULL DEFAULT 1;

-- ── 2. Candidate Question Reporting & Review Loop ─────────────────────────────
-- Allows students to flag ambiguous questions, disputed answer keys, or typos

CREATE TABLE IF NOT EXISTS public.reported_questions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id   UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL,
  issue_type   TEXT NOT NULL CHECK (issue_type IN ('incorrect_answer_key', 'ambiguous_question', 'typo_formatting', 'outdated_syllabus', 'other')),
  comment      TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reported_questions_student_id ON public.reported_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_reported_questions_attempt_id ON public.reported_questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_reported_questions_question_id ON public.reported_questions(question_id);

CREATE TRIGGER reported_questions_updated_at
  BEFORE UPDATE ON public.reported_questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 3. Row Level Security for reported_questions ──────────────────────────────

ALTER TABLE public.reported_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reported_questions: students insert own"
  ON public.reported_questions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "reported_questions: students read own"
  ON public.reported_questions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "reported_questions: admins manage all"
  ON public.reported_questions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

