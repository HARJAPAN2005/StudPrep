# Deployment — StudPrep

> Last updated: 2026-10-29

---

## Infrastructure

| Component | Service |
|---|---|
| Frontend + API | Vercel (Next.js) |
| Database | Supabase Cloud (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Google AI Studio / Vertex AI (Gemini) |
| CI/CD | GitHub Actions |

---

## Environment Variables

### Required for all environments

| Variable | Description | Client-side? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) | ❌ Server only |
| `GEMINI_API_KEY` | Google Gemini API key | ❌ Server only |
| `NEXT_PUBLIC_APP_URL` | Full URL of the deployed app | ✅ Yes |

> ⚠️ **NEVER** prefix `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` with `NEXT_PUBLIC_`. This would expose them in the browser bundle.

### Setting up `.env.local`

```bash
cp .env.local.example .env.local
# Fill in actual values
```

---

## Local Development

### Prerequisites

```bash
# Install Supabase CLI
npm install -g supabase

# Install pnpm
npm install -g pnpm
```

### First-time setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd StudPrep

# 2. Install dependencies
pnpm install

# 3. Copy environment file
cp .env.local.example .env.local
# Edit .env.local with your values

# 4. Start local Supabase
supabase start

# 5. Run migrations
supabase db push

# 6. Generate TypeScript types from schema
pnpm db:generate-types

# 7. Start dev server
pnpm dev
```

App is at [http://localhost:3000](http://localhost:3000)  
Supabase Studio at [http://localhost:54323](http://localhost:54323)

---

## Staging & Production Deployment

### Vercel

1. Connect the GitHub repository to Vercel
2. Set all environment variables in Vercel project settings
3. Set `NEXT_PUBLIC_APP_URL` to your production domain
4. Configure `Root Directory` to `.` (the monorepo root)

### Supabase Cloud

1. Create a Supabase project
2. Link the CLI: `supabase link --project-ref <ref>`
3. Push migrations: `supabase db push`
4. Set storage bucket policies via dashboard or migration

### CI/CD Pipeline (GitHub Actions)

```yaml
# On every push to main:
# 1. pnpm install
# 2. pnpm lint
# 3. pnpm type-check
# 4. pnpm test
# 5. Check pending migrations (block deploy if any)
# 6. Deploy to Vercel
```

---

## Database Migrations

Migrations are in `supabase/migrations/` and are version-controlled.

```bash
# Create a new migration
supabase migration new <description>

# Apply to local DB
supabase db push

# Apply to production (via CLI or CI)
supabase db push --linked
```

**Rules:**
- Never modify an existing migration file — create a new one
- Migration filenames must be `YYYYMMDDHHMMSS_description.sql`
- Every deploy must apply pending migrations before traffic shifts

---

## Rollback Procedure

1. Identify the last good migration
2. `supabase db push --local` to test the rollback migration
3. Apply rollback migration to production
4. Roll back the Vercel deployment to the previous build

---

## Monitoring

- **Vercel Analytics** — Core Web Vitals, page performance
- **Supabase Dashboard** — DB query performance, slow queries
- **Vercel Logs** — Server errors, API route logs
- **Sentry** (future phase) — Exception tracking

---

## Security Pre-Deploy Checklist

- [ ] All environment variables set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NOT prefixed with `NEXT_PUBLIC_`
- [ ] RLS enabled and tested for all tables
- [ ] Storage bucket is private
- [ ] CSP headers configured
- [ ] `pnpm audit` passes
- [ ] Playwright E2E auth tests pass against staging

