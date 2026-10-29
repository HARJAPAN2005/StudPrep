-- Migration: 20261029000004_exam_sessions
-- Creates exam_sessions and session_answers tables with RLS.

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE exam_status AS ENUM ('active', 'submitted', 'expired');

-- ── exam_sessions ────────────────────────────────────────────────────────────

CREATE TABLE public.exam_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ NOT NULL,
  time_limit_mins  SMALLINT NOT NULL CHECK (time_limit_mins BETWEEN 5 AND 180),
  total_questions  SMALLINT NOT NULL CHECK (total_questions > 0),
  score            SMALLINT CHECK (score BETWEEN 0 AND 100), -- percentage
  status           exam_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A session cannot be submitted before it starts
  CONSTRAINT valid_submission CHECK (
    submitted_at IS NULL OR submitted_at >= started_at
  ),
  -- Score only set after submission
  CONSTRAINT score_requires_submission CHECK (
    score IS NULL OR submitted_at IS NOT NULL
  )
);

CREATE INDEX idx_exam_sessions_student_id ON public.exam_sessions(student_id);
CREATE INDEX idx_exam_sessions_subject_id ON public.exam_sessions(subject_id);
CREATE INDEX idx_exam_sessions_status ON public.exam_sessions(status);

CREATE TRIGGER exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── session_answers ───────────────────────────────────────────────────────────

CREATE TABLE public.session_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_index  SMALLINT CHECK (selected_index BETWEEN 0 AND 3),
  is_correct      BOOLEAN,        -- NULL until session is scored
  time_spent_secs INT CHECK (time_spent_secs >= 0),
  answered_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One answer row per question per session
  UNIQUE (session_id, question_id)
);

CREATE INDEX idx_session_answers_session_id ON public.session_answers(session_id);
CREATE INDEX idx_session_answers_question_id ON public.session_answers(question_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

-- exam_sessions: students can read their own sessions
CREATE POLICY "exam_sessions: students can read own"
  ON public.exam_sessions
  FOR SELECT
  USING (auth.uid() = student_id);

-- exam_sessions: students can create their own sessions
CREATE POLICY "exam_sessions: students can insert own"
  ON public.exam_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- exam_sessions: admins can read all sessions
CREATE POLICY "exam_sessions: admins can read all"
  ON public.exam_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- session_answers: students can read answers for their own sessions
CREATE POLICY "session_answers: students can read own"
  ON public.session_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions
      WHERE id = session_id AND student_id = auth.uid()
    )
  );

-- session_answers: students can insert answers for their own active sessions
CREATE POLICY "session_answers: students can insert to active sessions"
  ON public.session_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exam_sessions
      WHERE id = session_id
        AND student_id = auth.uid()
        AND status = 'active'
    )
  );

-- session_answers: students can update their own answers in active sessions
CREATE POLICY "session_answers: students can update in active sessions"
  ON public.session_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions
      WHERE id = session_id
        AND student_id = auth.uid()
        AND status = 'active'
    )
  );

-- session_answers: admins can read all answers
CREATE POLICY "session_answers: admins can read all"
  ON public.session_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

