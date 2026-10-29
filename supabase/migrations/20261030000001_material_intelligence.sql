-- Migration: 20261030000001_material_intelligence
-- Implements Phase 5 AI Document Intelligence schema:
-- 1. material_analyses table storing versioned intelligence reports, topic hierarchies, questions, and content maps.
-- 2. material_corrections table enabling students to correct metadata or flag extraction mistakes.
-- 3. Row Level Security policies guaranteeing strict candidate isolation and administrative auditing.

-- ── 1. Enums ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_stage_status') THEN
    CREATE TYPE analysis_stage_status AS ENUM (
      'pending',
      'classifying',
      'extracting_topics',
      'detecting_questions',
      'mapping_content',
      'completed',
      'failed'
    );
  END IF;
END $$;

-- ── 2. material_analyses ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.material_analyses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id         UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  uploader_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version             INT NOT NULL DEFAULT 1,
  status              analysis_stage_status NOT NULL DEFAULT 'pending',
  current_stage       INT NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 6),
  classification      JSONB NOT NULL DEFAULT '{}'::jsonb,
  topics_hierarchy    JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_map         JSONB NOT NULL DEFAULT '{}'::jsonb,
  extraction_warnings TEXT[] DEFAULT ARRAY[]::TEXT[],
  stage_checkpoints   JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message       TEXT,
  token_usage         JSONB DEFAULT '{"inputTokens": 0, "outputTokens": 0, "totalTokens": 0}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Guaranteed one active analysis per document
  CONSTRAINT unique_document_analysis UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_material_analyses_doc_id ON public.material_analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_material_analyses_uploader ON public.material_analyses(uploader_id);
CREATE INDEX IF NOT EXISTS idx_material_analyses_status ON public.material_analyses(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS material_analyses_updated_at ON public.material_analyses;
CREATE TRIGGER material_analyses_updated_at
  BEFORE UPDATE ON public.material_analyses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 3. material_corrections ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.material_corrections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id     UUID NOT NULL REFERENCES public.material_analyses(id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field           TEXT NOT NULL,
  original_value  JSONB NOT NULL,
  corrected_value JSONB NOT NULL,
  flag_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_corrections_doc_id ON public.material_corrections(document_id);
CREATE INDEX IF NOT EXISTS idx_material_corrections_user ON public.material_corrections(user_id);

-- ── 4. Row Level Security Policies ───────────────────────────────────────────

ALTER TABLE public.material_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_corrections ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "material_analyses: users read own" ON public.material_analyses;
DROP POLICY IF EXISTS "material_analyses: admins read all" ON public.material_analyses;
DROP POLICY IF EXISTS "material_analyses: users insert own" ON public.material_analyses;
DROP POLICY IF EXISTS "material_analyses: users update own" ON public.material_analyses;
DROP POLICY IF EXISTS "material_analyses: users delete own" ON public.material_analyses;

DROP POLICY IF EXISTS "material_corrections: users read own" ON public.material_corrections;
DROP POLICY IF EXISTS "material_corrections: admins read all" ON public.material_corrections;
DROP POLICY IF EXISTS "material_corrections: users insert own" ON public.material_corrections;

-- material_analyses policies
CREATE POLICY "material_analyses: users read own"
  ON public.material_analyses
  FOR SELECT
  USING (auth.uid() = uploader_id);

CREATE POLICY "material_analyses: admins read all"
  ON public.material_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "material_analyses: users insert own"
  ON public.material_analyses
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "material_analyses: users update own"
  ON public.material_analyses
  FOR UPDATE
  USING (auth.uid() = uploader_id)
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "material_analyses: users delete own"
  ON public.material_analyses
  FOR DELETE
  USING (auth.uid() = uploader_id);

-- material_corrections policies
CREATE POLICY "material_corrections: users read own"
  ON public.material_corrections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "material_corrections: admins read all"
  ON public.material_corrections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "material_corrections: users insert own"
  ON public.material_corrections
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.role() = 'authenticated'
  );
