-- Migration: 20261029000005_analytics
-- Creates materialized progress snapshots for analytics.

-- ── progress_snapshots ────────────────────────────────────────────────────────
-- Stores pre-computed daily analytics per student per subject.
-- Updated by a background process after each session submission.

CREATE TABLE public.progress_snapshots (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id         UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  snapshot_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  avg_score          NUMERIC(5, 2) CHECK (avg_score BETWEEN 0 AND 100),
  sessions_count     INT NOT NULL DEFAULT 0 CHECK (sessions_count >= 0),
  questions_attempted INT NOT NULL DEFAULT 0 CHECK (questions_attempted >= 0),
  questions_correct   INT NOT NULL DEFAULT 0 CHECK (questions_correct >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One snapshot per student per subject per day
  UNIQUE (student_id, subject_id, snapshot_date)
);

CREATE INDEX idx_progress_student_id ON public.progress_snapshots(student_id);
CREATE INDEX idx_progress_subject_id ON public.progress_snapshots(subject_id);
CREATE INDEX idx_progress_snapshot_date ON public.progress_snapshots(snapshot_date);

CREATE TRIGGER progress_snapshots_updated_at
  BEFORE UPDATE ON public.progress_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;

-- Students can read their own snapshots
CREATE POLICY "progress_snapshots: students can read own"
  ON public.progress_snapshots
  FOR SELECT
  USING (auth.uid() = student_id);

-- Admins can read all snapshots
CREATE POLICY "progress_snapshots: admins can read all"
  ON public.progress_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only service role (system) can insert/update snapshots
-- (students and admins cannot manipulate analytics data)

