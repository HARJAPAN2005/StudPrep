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
  - `/dashboard/*`, `/exam/*`, `/materials/*`, `/analytics/*`, `/settings/*`, `/profile/*` — require an authenticated session
  - `/admin/*` — requires an authenticated session with staff/admin role in the `profiles` table
  - `/login`, `/register`, `/sign-in`, `/sign-up` — automatically redirects authenticated users to `/dashboard`

### 3. Isolated Admin-Role Authorization Model

Students are strictly prohibited from granting themselves administrative access:
- **Database Trigger Guard**: `trg_prevent_self_role_elevation` executes `BEFORE UPDATE ON public.profiles`. If `NEW.role != OLD.role` and the invoking user is not an administrator, PostgreSQL raises an exception (`'Unauthorized: Users cannot modify their own role.'`).
- **RLS Policy Check**: The `profiles: users can update own non-role` policy includes `WITH CHECK (auth.uid() = id AND role = OLD.role)`.
- **Application Layer Whitelisting**: Server actions (`updateProfileAction`) whitelist only `full_name` via `UpdateProfileSchema` and explicitly reject any `role` payload in the form data.
- **Server Guard (`preventRoleSelfElevation`)**: Enforces in code that non-admin callers cannot alter user roles.

### 4. Private Materials Storage Bucket & Object Policies

Study materials uploaded by candidates are stored in the private `materials` Supabase Storage bucket:
- **Bucket Visibility**: `public = false`. Anonymous or unauthenticated access is rejected at the storage gateway.
- **Path Namespace Isolation**: Uploads strictly follow the namespace convention `materials/{user_id}/{filename}`.
- **Object RLS Policies**:
  - `materials: users read own files`: Grants SELECT if `(storage.foldername(name))[1] = auth.uid()::text` OR user is admin.
  - `materials: users upload to own folder`: Grants INSERT with `WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text)`.
  - `materials: users delete own files`: Grants DELETE if folder matches `auth.uid()::text` OR user is admin.
- **Path Traversal Guards**: Server-side helper `verifyStoragePathAccess` rejects path traversal sequences (`..`), leading slashes, and backslashes.

### 5. Server-Side Authorization Helpers (`lib/auth/authorization.ts`)

- `requireUser(supabase)`: Asserts valid JWT session; throws `UnauthorizedError` (401).
- `requireAdmin(supabase)`: Asserts valid JWT session with `role === 'admin'`; throws `ForbiddenError` (403).
- `assertResourceOwnership(ownerId, currentUserId, isAdmin)`: Asserts caller owns the record or is admin.
- `verifyDocumentAccess(supabase, documentId, currentUserId, isAdmin)`: Fetches document from database and confirms ownership. Never relies on client-provided ownership flags.
- `verifyExamSessionAccess(supabase, sessionId, currentUserId, isAdmin)`: Confirms exam session ownership.
- `verifyStoragePathAccess(storagePath, currentUserId, isAdmin)`: Validates user namespace prefix and blocks traversal.

### 6. Answer Key Protection & Exam Engine Integrity (Phases 6 & 7)

Answer key confidentiality and exam session immutability are the highest security priorities of the CBT platform.

1. **Zero Client Leakage During Active Tests**:
   - `exam_snapshots` records contain the complete question bank (with `correctOptionId`, worked explanations, and option rationales) in PostgreSQL.
   - When an attempt is active, `getAttemptStateAction` runs `sanitizeQuestionForAttempt`, which explicitly strips `correctOptionId`, worked explanations, and option-level explanations.
   - At no point during an active exam are correct answers or rationales present in browser memory, React state, network responses, or client DOM.
2. **Snapshot Immutability**:
   - Once a student starts an attempt, it references an immutable versioned snapshot in `exam_snapshots`.
   - Modifying or deleting questions in an exam template cannot alter the question bank, option order, or marking scheme of an already-started attempt.
3. **Server-Authoritative Deadlines**:
   - Exam deadlines (`expires_at`) are calculated and validated server-side.
   - The browser timer is strictly a display convenience.
   - Every autosave operation (`autosaveAnswerAction`) checks `now > expires_at`. If the deadline has expired, the answer change is rejected and the attempt is automatically finalized.
   - Late client requests cannot alter test responses after the deadline has passed.
4. **Idempotent Submission & Anti-Tampering**:
   - `submitExamAttemptAction` is strictly idempotent. If invoked multiple times concurrently or on reload, it returns the recorded score and prevents duplicate evaluation.
   - Once `status` becomes `submitted` or `expired`, answer changes are rejected.
5. **Fixed Ordering Per Attempt**:
   - Random question order and option mappings are calculated once at attempt creation and persisted in `question_order` and `option_orders`. This prevents option-order shifting or tampering via browser refresh.

### 4. Document & AI Input Safety (Phase 5 Defense-in-Depth)

Uploaded documents and extracted text are treated as **untrusted user input**, never as executable instructions or trusted system directives.

1. **Delimiter Escaping Against Prompt Breakout (`lib/ai/prompt-safety.ts`)**:
   - The platform frames student text strictly within `<document_evidence>` and `<page_evidence>` tags.
   - Any occurrences of delimiter tags within student documents (e.g. `</document_evidence>`, `<system_instruction>`, `</instructions>`) are escaped into XML entities (`&lt;/document_evidence&gt;`). This makes prompt breakout syntactically impossible for the LLM tokenizer.
2. **Heuristic Prompt-Injection Detection (`inspectForPromptInjection`)**:
   - Proactively inspects incoming document text for jailbreak phrases, role-play manipulation (e.g., "ignore all previous instructions", "you are now DAN"), and sensitive configuration probes (e.g. "print your system prompt", "reveal GEMINI_API_KEY").
   - Suspicious inputs trigger extraction warnings or fail-closed pipeline rejection (`AIPromptInjectionDetectedError`).
3. **Structured Response Contracts & Rejection (`lib/ai/schemas.ts`)**:
   - Model responses are never evaluated dynamically or accepted as unstructured markdown.
   - Every stage output is validated with strict Zod contracts. If a model hallucinates extra fields, omits required parameters, or returns invalid types, `AISchemaValidationError` is thrown and the call is retried or failed closed.
4. **Server-Side Key Isolation**:
   - `GEMINI_API_KEY` is loaded exclusively in server runtime contexts (`lib/ai/provider.ts`). It is never bundled into client-side JavaScript or rendered in HTML attributes.
5. **Database RLS on Analyses & Corrections**:
   - `material_analyses` and `material_corrections` enforce PostgreSQL RLS policies where `uploader_id = auth.uid()` / `user_id = auth.uid()`. Students cannot read or alter analyses belonging to other candidates.

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

### 11. Grading & Answer Key Disclosure Security (Phase 8)

- **Pure Server-Authoritative Grading**: Objective scoring is calculated exclusively on the server using immutable snapshots. Client scores or marks submitted from browsers are rejected.
- **Strict Answer Key Masking During Active Exams**: Solutions and answer keys are locked (`403 Forbidden`) until the candidate submits or the server deadline expires. Safe client DTOs strip all correct option IDs and explanations.
- **Idempotent Atomic Finalization**: Finalized attempts cannot be modified, re-scored, or double-submitted. Concurrent requests receive identical, tamper-proof cached results.
- **Student-Scoped Question Reporting**: The `reported_questions` table is secured with RLS (`auth.uid() = student_id`). Students cannot dispute questions or inspect reports belonging to other students.

### 12. Student Analytics & AI Tutor Isolation (Phase 9)

- **Strict Student Ownership Isolation**: Analytics queries are strictly scoped to the authenticated user (`student_id = auth.uid()`). Cross-student analytics aggregation or record inspection is blocked by RLS policies and server-side verification.
- **Aggregated AI Prompts Only**: The AI revision-plan generator never receives raw document text, un-attempted questions, or sensitive student PII. Only authorized, schema-validated metric summaries are provided to the model.
- **Post-Submission Bounded AI Tutor**: AI tutoring is locked during active exam attempts (`403 Forbidden`). Prompts are strictly bounded to the single question stem, submitted answer, and correct explanation, preventing answer key disclosure across un-attempted questions.
- **Transparent Provenance & Uncertainty**: AI tutor output surfaces explicit confidence tags (`verified_source`, `inferred`, `general_knowledge`) and cache provenance badges, preventing candidates from mistaking AI conjecture for syllabus truth.

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

