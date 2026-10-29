-- Migration: 20261029000006_storage_and_role_protection
-- 1. Hardens profile role updates (prevents self-elevation from student to admin).
-- 2. Sets up the private 'materials' storage bucket with strict RLS policies.
-- 3. Adds 'text/plain' to supported document MIME types.

-- ── 1. Role Protection Trigger & Policy ──────────────────────────────────────

-- Trigger function: Prevents non-admin users from changing their role
CREATE OR REPLACE FUNCTION public.prevent_self_role_elevation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if the current user has admin role
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Users cannot modify their own role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_self_role_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_elevation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_elevation();

-- Update RLS: Standard users can only update their own profile without altering role
DROP POLICY IF EXISTS "profiles: users can update own" ON public.profiles;
CREATE POLICY "profiles: users can update own non-role"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = OLD.role);

-- Admins can update any profile (including role changes)
DROP POLICY IF EXISTS "profiles: admins can update any" ON public.profiles;
CREATE POLICY "profiles: admins can update any"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 2. Private Materials Storage Bucket & Policies ───────────────────────────

-- Create private materials bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  FALSE,
  20971520, -- 20 MB max
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for materials bucket to avoid duplication
DROP POLICY IF EXISTS "materials: users read own files" ON storage.objects;
DROP POLICY IF EXISTS "materials: users upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "materials: users update own files" ON storage.objects;
DROP POLICY IF EXISTS "materials: users delete own files" ON storage.objects;

-- SELECT: Students can only read files within their own user_id directory; Admins can read all
CREATE POLICY "materials: users read own files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'materials' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- INSERT: Authenticated students can only upload to their own user_id folder
CREATE POLICY "materials: users upload to own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'materials' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: Students can update objects within their own directory only
CREATE POLICY "materials: users update own files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: Students can delete their own objects; Admins can delete any
CREATE POLICY "materials: users delete own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'materials' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ── 3. Document MIME types update ───────────────────────────────────────────

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_mime_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_mime_type_check CHECK (
  mime_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  )
);
