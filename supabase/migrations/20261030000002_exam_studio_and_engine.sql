-- Migration: 20261030000002_exam_studio_and_engine
-- Phase 6: Exam Configuration Studio & Immutable Snapshots
-- Phase 7: Examination Engine, Attempts & Server-Authoritative Deadlines

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE exam_mode AS ENUM ('recreate_source', 'generate_practice', 'mixed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_question_type AS ENUM ('single_choice', 'true_false');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attempt_status AS ENUM ('not_started', 'in_progress', 'submitted', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 1. Reusable Exam Configurations (Studio Templates) ───────────────────────

CREATE TABLE IF NOT EXISTS public.exam_configurations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  subject_id              UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  mode                    exam_mode NOT NULL DEFAULT 'generate_practice',
  material_ids            UUID[] NOT NULL DEFAULT '{}',
  topic_ids               TEXT[] NOT NULL DEFAULT '{}',
  question_count          INT NOT NULL CHECK (question_count BETWEEN 5 AND 100),
  duration_minutes        INT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 240),
  difficulty_distribution JSONB NOT NULL DEFAULT '{"easy": 30, "medium": 50, "hard": 20}'::jsonb,
  marks_per_question      NUMERIC(4,2) NOT NULL DEFAULT 1.0 CHECK (marks_per_question > 0),
  negative_marking        NUMERIC(4,2) NOT NULL DEFAULT 0.0 CHECK (negative_marking >= 0),
  shuffle_questions       BOOLEAN NOT NULL DEFAULT TRUE,
  shuffle_options         BOOLEAN NOT NULL DEFAULT TRUE,
  feedback_timing         TEXT NOT NULL DEFAULT 'after_submission' CHECK (feedback_timing IN ('immediate', 'after_submission')),
  sections                JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_configurations_user_id ON public.exam_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_configurations_subject_id ON public.exam_configurations(subject_id);

CREATE TRIGGER exam_configurations_updated_at
  BEFORE UPDATE ON public.exam_configurations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 2. Immutable Exam Snapshots ──────────────────────────────────────────────
-- Published when a candidate starts an attempt or finalizes a configuration.
-- Protected server-side record: contains questions, answer keys, worked solutions.
-- Client exam runners query sanitized views or server actions with answer keys stripped.

CREATE TABLE IF NOT EXISTS public.exam_snapshots (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  configuration_id        UUID REFERENCES public.exam_configurations(id) ON DELETE SET NULL,
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version                 INT NOT NULL DEFAULT 1,
  title                   TEXT NOT NULL,
  subject_id              UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  mode                    exam_mode NOT NULL,
  duration_minutes        INT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 240),
  total_questions         INT NOT NULL CHECK (total_questions > 0),
  total_marks             NUMERIC(6,2) NOT NULL CHECK (total_marks > 0),
  negative_marking        NUMERIC(4,2) NOT NULL DEFAULT 0.0,
  sections                JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions               JSONB NOT NULL, -- Complete question bank with answer keys & solutions
  published_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_snapshots_user_id ON public.exam_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_snapshots_configuration_id ON public.exam_snapshots(configuration_id);

-- ── 3. Active Examination Attempts ───────────────────────────────────────────
-- Manages session state, autosaved answers, review flags, and server-authoritative deadlines.

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id             UUID NOT NULL REFERENCES public.exam_snapshots(id) ON DELETE CASCADE,
  student_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                  attempt_status NOT NULL DEFAULT 'not_started',
  started_at              TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,
  submitted_at            TIMESTAMPTZ,
  question_order          JSONB NOT NULL DEFAULT '[]'::jsonb, -- Fixed randomized array of question IDs
  option_orders           JSONB NOT NULL DEFAULT '{}'::jsonb, -- Fixed randomized option mapping { [qid]: [optId...] }
  answers                 JSONB NOT NULL DEFAULT '{}'::jsonb, -- { [questionId]: selectedOptionId }
  review_flags            JSONB NOT NULL DEFAULT '{}'::jsonb, -- { [questionId]: boolean }
  visited_questions       JSONB NOT NULL DEFAULT '{}'::jsonb, -- { [questionId]: boolean }
  score                   INT CHECK (score BETWEEN 0 AND 100), -- Percentage
  marks_obtained          NUMERIC(6,2),
  max_marks               NUMERIC(6,2),
  correct_count           INT DEFAULT 0,
  incorrect_count         INT DEFAULT 0,
  unanswered_count        INT DEFAULT 0,
  time_spent_seconds      INT DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_attempt_timestamps CHECK (
    started_at IS NULL OR expires_at IS NULL OR expires_at >= started_at
  ),
  CONSTRAINT valid_attempt_submission CHECK (
    submitted_at IS NULL OR (started_at IS NOT NULL AND submitted_at >= started_at)
  )
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_id ON public.exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_snapshot_id ON public.exam_attempts(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON public.exam_attempts(status);

CREATE TRIGGER exam_attempts_updated_at
  BEFORE UPDATE ON public.exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 4. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.exam_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- exam_configurations policies
CREATE POLICY "exam_configurations: students manage own"
  ON public.exam_configurations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exam_configurations: admins read all"
  ON public.exam_configurations
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- exam_snapshots policies
CREATE POLICY "exam_snapshots: students read and insert own"
  ON public.exam_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exam_snapshots: students insert own"
  ON public.exam_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exam_snapshots: admins read all"
  ON public.exam_snapshots
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- exam_attempts policies
CREATE POLICY "exam_attempts: students read own"
  ON public.exam_attempts
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "exam_attempts: students insert own"
  ON public.exam_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "exam_attempts: students update own"
  ON public.exam_attempts
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "exam_attempts: admins read all"
  ON public.exam_attempts
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

