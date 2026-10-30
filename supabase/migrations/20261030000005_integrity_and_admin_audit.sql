-- ==============================================================================
-- Migration: 20261030000005_integrity_and_admin_audit.sql
-- Description: Examination integrity telemetry, non-punitive event logging,
--              and administrative audit trails for Phase 10.
-- ==============================================================================

-- 1. Examination Integrity Events Table
-- Records browser focus, visibility, fullscreen transitions, and pacing events
-- without intrusive screen recording or unauthorized personal data capture.
CREATE TABLE IF NOT EXISTS public.exam_integrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_integrity_event_type CHECK (
    event_type IN (
      'fullscreen_entry',
      'fullscreen_exit',
      'visibility_hidden',
      'visibility_visible',
      'window_blur',
      'window_focus',
      'reconnect',
      'submission',
      'heartbeat'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_exam_integrity_events_attempt ON public.exam_integrity_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_integrity_events_student ON public.exam_integrity_events(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_integrity_events_created ON public.exam_integrity_events(created_at DESC);

-- 2. Administrative Audit Logs Table
-- Immutable audit log recording consequential administrative actions
-- (job retries, question dispute resolutions, data purges, permission changes).
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.exam_integrity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Exam Integrity Events RLS
-- Students can insert integrity events for their own examination attempt
CREATE POLICY "Students can insert own integrity events"
  ON public.exam_integrity_events
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
  );

-- Students can read their own integrity events
CREATE POLICY "Students can view own integrity events"
  ON public.exam_integrity_events
  FOR SELECT
  USING (
    auth.uid() = student_id
  );

-- Administrators can view all integrity events
CREATE POLICY "Admins can view all integrity events"
  ON public.exam_integrity_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admin Audit Logs RLS
-- Only authenticated administrators can read the audit trail
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only authenticated administrators can insert into the audit trail
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

