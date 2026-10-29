-- Migration: 20261030000000_document_ingestion_and_pages
-- Extends document ingestion with:
-- 1. document_pages table for page-by-page extracted text storage.
-- 2. document_processing_jobs table with queued, processing, completed, failed, retryable states.
-- 3. Row Level Security policies ensuring strict candidate isolation and administrative auditing.

-- ── 1. Enums ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processing_job_status') THEN
    CREATE TYPE processing_job_status AS ENUM (
      'queued',
      'processing',
      'completed',
      'failed',
      'retryable'
    );
  END IF;
END $$;

-- ── 2. document_pages ─────────────────────────────────────────────────────────
-- Stores extracted text per page, preserving document order and enabling page preview.

CREATE TABLE IF NOT EXISTS public.document_pages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id    UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number    INT NOT NULL CHECK (page_number > 0),
  extracted_text TEXT NOT NULL,
  word_count     INT NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  has_low_text   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per page per document
  CONSTRAINT unique_document_page UNIQUE (document_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_document_pages_document_id ON public.document_pages(document_id);
CREATE INDEX IF NOT EXISTS idx_document_pages_page_order ON public.document_pages(document_id, page_number);

-- ── 3. document_processing_jobs ──────────────────────────────────────────────
-- Tracks the lifecycle of asynchronous document ingestion & OCR background jobs.

CREATE TABLE IF NOT EXISTS public.document_processing_jobs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id         UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  uploader_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status              processing_job_status NOT NULL DEFAULT 'queued',
  attempt_count       INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts        INT NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  error_message       TEXT,
  extraction_warnings TEXT[] DEFAULT ARRAY[]::TEXT[],
  ocr_required        BOOLEAN NOT NULL DEFAULT FALSE,
  ocr_applied         BOOLEAN NOT NULL DEFAULT FALSE,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotency guarantee: exactly one processing job record per document
  CONSTRAINT unique_document_job UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS idx_document_jobs_document_id ON public.document_processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_uploader_id ON public.document_processing_jobs(uploader_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON public.document_processing_jobs(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS document_processing_jobs_updated_at ON public.document_processing_jobs;
CREATE TRIGGER document_processing_jobs_updated_at
  BEFORE UPDATE ON public.document_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 4. Row Level Security Policies ───────────────────────────────────────────

ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Clean any existing policies
DROP POLICY IF EXISTS "document_pages: users can read own" ON public.document_pages;
DROP POLICY IF EXISTS "document_pages: admins can read all" ON public.document_pages;
DROP POLICY IF EXISTS "document_processing_jobs: users can read own" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "document_processing_jobs: admins can read all" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "document_processing_jobs: users can insert own" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "document_processing_jobs: users can update own" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "document_processing_jobs: users can delete own" ON public.document_processing_jobs;

-- document_pages: Students can read pages belonging to documents they own
CREATE POLICY "document_pages: users can read own"
  ON public.document_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND uploader_id = auth.uid()
    )
  );

-- document_pages: Admins can read all document pages
CREATE POLICY "document_pages: admins can read all"
  ON public.document_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- document_processing_jobs: Students can read their own processing jobs
CREATE POLICY "document_processing_jobs: users can read own"
  ON public.document_processing_jobs
  FOR SELECT
  USING (auth.uid() = uploader_id);

-- document_processing_jobs: Admins can read all processing jobs
CREATE POLICY "document_processing_jobs: admins can read all"
  ON public.document_processing_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- document_processing_jobs: Authenticated users can insert jobs for documents they own
CREATE POLICY "document_processing_jobs: users can insert own"
  ON public.document_processing_jobs
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id AND
    auth.role() = 'authenticated'
  );

-- document_processing_jobs: Students can update status to retry failed jobs
CREATE POLICY "document_processing_jobs: users can update own"
  ON public.document_processing_jobs
  FOR UPDATE
  USING (auth.uid() = uploader_id)
  WITH CHECK (auth.uid() = uploader_id);

-- document_processing_jobs: Students can delete their own jobs
CREATE POLICY "document_processing_jobs: users can delete own"
  ON public.document_processing_jobs
  FOR DELETE
  USING (auth.uid() = uploader_id);

