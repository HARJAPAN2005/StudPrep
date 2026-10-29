-- Migration: 20261029000002_documents
-- Creates the documents table, storage bucket, and RLS policies.
-- Documents are uploaded study materials (PDF/DOCX) per subject.

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE document_status AS ENUM ('pending', 'processing', 'ready', 'failed');

-- ── documents ────────────────────────────────────────────────────────────────

CREATE TABLE public.documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id    UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL UNIQUE,
  filename      TEXT NOT NULL,
  file_size     BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 20971520), -- 20 MB max
  mime_type     TEXT NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  status        document_status NOT NULL DEFAULT 'pending',
  page_count    INT CHECK (page_count > 0),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_uploader_id ON public.documents(uploader_id);
CREATE INDEX idx_documents_subject_id ON public.documents(subject_id);
CREATE INDEX idx_documents_status ON public.documents(status);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Users can see their own uploaded documents
CREATE POLICY "documents: users can read own"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = uploader_id);

-- Admins can read all documents
CREATE POLICY "documents: admins can read all"
  ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can upload documents (insert)
CREATE POLICY "documents: authenticated users can insert"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id AND
    auth.role() = 'authenticated'
  );

-- Users can delete their own pending documents only (not yet processed)
CREATE POLICY "documents: users can delete own pending"
  ON public.documents
  FOR DELETE
  USING (auth.uid() = uploader_id AND status = 'pending');

-- Admins can delete any document
CREATE POLICY "documents: admins can delete any"
  ON public.documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Supabase Storage: documents bucket ────────────────────────────────────────
-- NOTE: Bucket creation via SQL is for reference. Create the bucket in
-- Supabase Dashboard or use the JS SDK with service role.
-- Bucket name: 'documents' | Public: false
-- Storage RLS mirrors the table RLS above, enforced by Supabase Storage policies.

