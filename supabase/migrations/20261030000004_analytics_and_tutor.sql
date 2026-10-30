-- ==============================================================================
-- Migration: 20261030000004_analytics_and_tutor.sql
-- Description: Phase 9 - AI Question Tutor Response Cache.
--              Analytics are derived from exam_attempts + exam_snapshots (no
--              new aggregation tables needed). The cache table avoids redundant
--              AI API calls for repeated tutor requests on the same question.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.question_tutor_cache (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id   UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL,
  response     JSONB NOT NULL,
  model        TEXT NOT NULL DEFAULT 'unknown',
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_tutor_cache UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_student_id ON public.question_tutor_cache(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_cache_attempt_id ON public.question_tutor_cache(attempt_id);

ALTER TABLE public.question_tutor_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutor_cache: students read own"
  ON public.question_tutor_cache
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "tutor_cache: students insert own"
  ON public.question_tutor_cache
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "tutor_cache: admins manage all"
  ON public.question_tutor_cache
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

