# Architecture — StudPrep

> Last updated: 2026-10-29

## Overview

StudPrep is a full-stack web application built with **Next.js 15 App Router**. The system is composed of four logical layers:

1. **Presentation** — React Server Components + Client Components
2. **Application** — Next.js Server Actions and Route Handlers
3. **Data** — Supabase (PostgreSQL + Auth + Storage)
4. **AI** — Google Gemini API (server-side only)

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (Client)                                                    │
│  ┌─────────────────────┐     ┌──────────────────────────────────┐   │
│  │  React Client        │     │  Next.js App Router (RSC)        │   │
│  │  Components          │◄───►│  Server Components               │   │
│  │  (exam UI, forms)    │     │  Server Actions                  │   │
│  └─────────────────────┘     └────────────┬─────────────────────┘   │
└───────────────────────────────────────────│─────────────────────────┘
                                            │ Server-side only
           ┌────────────────────────────────┼────────────────────┐
           │                                │                    │
           ▼                                ▼                    ▼
   ┌───────────────┐              ┌──────────────────┐  ┌──────────────────┐
   │  Supabase     │              │  Supabase        │  │  Google Gemini   │
   │  PostgreSQL   │              │  Storage         │  │  API             │
   │  (RLS-gated)  │              │  (private)       │  │  (structured     │
   │               │              │  Signed URLs     │  │   JSON output)   │
   └───────────────┘              └──────────────────┘  └──────────────────┘
```

---

## Directory Layout

```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── (dashboard)/
│   ├── layout.tsx              # Authenticated shell
│   ├── page.tsx                # Student home
│   ├── subjects/page.tsx
│   └── profile/page.tsx
├── (exam)/
│   ├── layout.tsx              # Distraction-free exam shell
│   └── [sessionId]/page.tsx   # Active CBT session
├── (admin)/
│   ├── layout.tsx              # Admin-only guard
│   ├── page.tsx
│   ├── subjects/
│   ├── documents/
│   └── questions/
└── api/
    ├── ai/generate/route.ts    # Server-only AI endpoint
    └── storage/sign/route.ts   # Signed URL generator

lib/
├── supabase/
│   ├── client.ts               # Browser client (createBrowserClient)
│   ├── server.ts               # Server client (createServerClient, cookies)
│   └── admin.ts                # Service-role client (server-only)
├── ai/
│   ├── gemini.ts               # Gemini client factory
│   ├── generate-questions.ts   # Question generation pipeline
│   └── schemas.ts              # Zod schemas for AI outputs
└── schemas/
    ├── question.ts             # Question Zod schema
    ├── session.ts              # Exam session schema
    └── document.ts             # Document upload schema

middleware.ts                   # Auth guard + role redirect

supabase/
└── migrations/
    ├── 20261029000000_init_profiles.sql
    ├── 20261029000001_subjects.sql
    ├── 20261029000002_documents.sql
    ├── 20261029000003_questions.sql
    ├── 20261029000004_exam_sessions.sql
    └── 20261029000005_analytics.sql
```

---

## Data Flow: Question Generation

```
1. Admin uploads PDF → Supabase Storage (private bucket)
2. Server Action triggers text extraction (server-side, pdfjs-dist or similar)
3. Extracted text (treated as untrusted data) → sanitised → Gemini prompt
4. Gemini returns structured JSON → validated with Zod schema
5. Valid questions written to `questions` table via service-role client
6. Document status updated to `ready`
```

## Data Flow: CBT Exam Session

```
1. Student requests session (subject, count) → Server Action
2. Server randomly selects questions → creates `exam_sessions` row
3. Questions returned WITHOUT correct_index or explanation (view)
4. Student answers submitted per-question → `session_answers` rows
5. On submission → Server Action scores all answers
6. Results (with explanations) returned only after scoring
```

---

## Supabase Client Strategy

| Client | File | Use Case |
|---|---|---|
| Browser | `lib/supabase/client.ts` | Client components, real-time subscriptions |
| Server | `lib/supabase/server.ts` | RSC, Server Actions, Route Handlers |
| Admin | `lib/supabase/admin.ts` | Service role — bypasses RLS (AI pipeline, scoring) |

> **Rule**: The admin client is NEVER imported in any file that can be tree-shaken into the browser bundle. It is exclusively used in `api/` Route Handlers and Server Actions marked `"use server"`.

---

## Caching Strategy

| Data | Strategy |
|---|---|
| Subject list | `cache: 'force-cache'` — changes rarely |
| Question list (admin) | `revalidate: 60` |
| Student session | `no-store` — must be fresh |
| Progress analytics | `revalidate: 300` |

---

## State Management

No global state store is needed. State is managed by:
- **URL state** (search params for filters)
- **React Server Components** (data fetched on server)
- **`useReducer`** (exam session timer + answer tracking in client)
- **Supabase real-time** (document processing status)

