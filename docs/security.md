# Security — StudPrep

> Last updated: 2026-10-29

## Threat Model

StudPrep handles:
- Student PII (email, name, exam scores)
- Uploaded study documents (potentially proprietary)
- Examination answer keys (must not leak before submission)
- Payments (future phase — not in scope yet)

---

## Security Controls

### 1. Authentication & Sessions

- **Supabase Auth** manages all authentication. We never handle raw passwords.
- Sessions are stored in **HTTP-only cookies** via `@supabase/ssr`. JavaScript cannot access them.
- Session cookies are `Secure` (HTTPS only) and `SameSite=Lax`.
- Password reset flows use time-limited, single-use tokens from Supabase Auth.
- OAuth flows use PKCE to prevent code interception.

### 2. Authorisation & Row Level Security

- **Every table has RLS enabled**. There are no public tables.
- The service-role (admin) client that bypasses RLS is **imported only in server-only files** (`lib/supabase/admin.ts`) and is never tree-shaken into the browser bundle.
- `middleware.ts` enforces route-level access control:
  - `/dashboard/*` — requires authenticated session
  - `/admin/*` — requires `role = 'admin'` in the `profiles` table
  - `/exam/*` — requires authenticated session

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

