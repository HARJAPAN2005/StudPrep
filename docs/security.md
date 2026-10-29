# Security — StudPilot

> Last updated: October 2026

## Threat Model

StudPilot handles:
- Candidate PII (email, name, examination preferences, exam performance metrics)
- Uploaded study documents & syllabus materials (PDF, DOCX, TXT)
- Examination answer keys & rationales (must never be exposed to clients prior to submission)
- AI generation prompts (must be guarded against prompt injection from untrusted input)

---

## Security Controls

### 1. Authentication & Sessions

- **Supabase Auth** manages all user authentication. Raw passwords are never handled directly.
- Sessions are stored in **HTTP-only cookies** via `@supabase/ssr`. Client JavaScript cannot access them.
- Session cookies are configured with `Secure` (HTTPS only) and `SameSite=Lax`.
- Password reset flows use time-limited, single-use tokens managed by Supabase Auth.
- OAuth flows use PKCE (Proof Key for Code Exchange) to prevent code interception.

### 2. Authorization & Edge Route Protection

- **Every database table has RLS enabled**. There are no unprotected public tables.
- The service-role (admin) client that bypasses RLS is restricted strictly to server-only files (`lib/supabase/admin.ts`) and is never included in client bundles.
- Next.js 16 Edge Proxy (`proxy.ts`) enforces strict route-level access control:
  - `/dashboard/*` — requires an authenticated session
  - `/admin/*` — requires authenticated session with staff/admin role in the `profiles` table
  - `/exam/*` — requires an authenticated session
  - `/login`, `/register`, `/sign-in`, `/sign-up` — automatically redirects authenticated users to `/dashboard`

### 3. Answer Key Protection

This is the most critical security control for a CBT platform.

- The `questions` table contains a `correct_index` column and an `explanation` column.
- A database **view** called `questions_public` selects all columns **except** `correct_index` and `explanation`.
- RLS on `questions` grants students SELECT only through `questions_public`, never the base table.
- `correct_index` is only read server-side (service-role client) during session scoring.
- Results including explanations are returned only **after** `exam_sessions.submitted_at` is set.

```sql
-- The view students query
CREATE VIEW questions_public AS
  SELECT id, subject_id, body, options, difficulty, source_page
  FROM questions;
```

### 4. Document & AI Input Safety

- Uploaded files are stored in **Supabase Storage** with a private bucket.
- **No public bucket URLs** exist. All access is via short-lived signed URLs.
- Extracted text from uploaded documents is treated as **untrusted user data**, not instructions.
- The AI prompt is structured so that document content is placed in a clearly delimited `<document_text>` block with an explicit system instruction to treat it as data only.
- Prompt injection mitigations:
  - Maximum text length truncated before prompt construction
  - Document content is never interpolated into the system prompt role
  - AI output is Zod-validated; any output not matching the schema is rejected

### 5. API Route Security

- All Route Handlers that mutate data validate the session server-side before acting.
- AI generation endpoints (`/api/ai/generate`) are:
  - Server-side only (key never exposed to client)
  - Rate-limited per user (max N requests/hour)
  - Require a valid session
- `Origin` header validated on API routes to prevent cross-origin form submissions.

### 6. File Upload Security

- Accepted MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Maximum file size: 20 MB
- Files are stored under a path keyed by `user_id/uuid.ext` — users cannot access each other's paths
- Supabase Storage RLS prevents cross-user file access

### 7. Environment & Secrets

- **No secrets in code or git**. All secrets are environment variables.
- `.env.local` is gitignored. `.env.local.example` shows the shape with placeholder values.
- Required environment variables at runtime:
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY   ← server-only, never prefixed NEXT_PUBLIC_
  GEMINI_API_KEY              ← server-only, never prefixed NEXT_PUBLIC_
  ```
- The `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must never appear in any `NEXT_PUBLIC_*` variable.

### 8. Content Security Policy

- A CSP header is set in `next.config.ts` headers configuration.
- `script-src 'self'` — no inline scripts
- `connect-src` includes only Supabase domain and Gemini API domain

### 9. Input Validation

- All form inputs are validated with Zod schemas on **both client (UX) and server (enforcement)**.
- Client-side validation is a convenience only — server-side is authoritative.

### 10. Dependency Security

- `pnpm audit` runs in CI on every push.
- Dependabot alerts are reviewed weekly.

---

## Security Checklist (Pre-deploy)

- [ ] RLS enabled on all tables — verified with `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` cross-checked against `pg_policies`
- [ ] No `NEXT_PUBLIC_` variables contain secrets
- [ ] Supabase Storage bucket is private (not public)
- [ ] CSP headers in place
- [ ] Rate limiting on AI endpoints
- [ ] `pnpm audit` passes with no high/critical vulnerabilities
- [ ] Playwright auth test: unauthenticated user cannot access `/dashboard`
- [ ] Playwright test: student cannot retrieve `correct_index` via API before submission

---

## Incident Response

If answer keys are suspected to have leaked:
1. Immediately rotate the Supabase service role key
2. Audit `exam_sessions` for anomalous patterns
3. Review Vercel/Supabase logs for unexpected API calls
4. Notify affected users per GDPR/data protection obligations

