# StudPilot · AI-Powered CBT Examination Preparation Platform

> **StudPilot** is a high-stakes Computer-Based Testing (CBT) and diagnostic preparation platform tailored for West African and professional examinations (JAMB UTME, WAEC WASSCE, NECO SSCE, and ICAN). It turns raw study materials and past questions into rigorous, timed exam simulations with instant diagnostic feedback.

---

## 🚀 Key Features (Phases 1 - 8 Completed)

1. **Deterministic Server-Side Grading & Results Diagnostics (Phase 8)**:
   - Pure algorithmic grading of objective question types (`single_choice`, `true_false`) with zero reliance on AI models as authoritative evaluators.
   - Positive marks, configurable negative penalties, zero-mark clamping (scores >= 0), and section/topic score aggregation.
   - Topic mastery classifications (`mastered` >= 75%, `competent` >= 50%, `needs_review` < 50%).
   - Authentic historical progress tracking against previous attempts on the same configuration (baseline for first attempt, no fake percentiles).
   - Filterable item review (All, Correct, Incorrect, Unanswered, Flagged) with worked solutions, distractor rationales, and page citations.
   - AI-synthesized vs source paper question badges with review status.
   - Candidate question report dialog and server handler persisting to `reported_questions`.
2. **Examination Engine & CBT Runner (Phase 7)**:
   - Distraction-free dark workstation (`/exam/[id]`) with live countdown timer and optional fullscreen mode.
   - Pre-exam instructions modal with explicit testing rules and negative marking disclosures.
   - Server-authoritative deadlines with automatic timeout finalization.
   - Debounced autosave engine with status feedback (`Saving...`, `All answers saved`, `Offline`).
   - Question palette tracking Answered, Unanswered, Marked for Review, and Visited states.
   - Keyboard support (numeric 1-4 and letters A-D) with full accessibility.
   - Idempotent submission, negative marking penalties, and detailed post-exam worked solutions review (`/exam/[id]/results`).
2. **Exam Configuration Studio & Immutable Snapshots (Phase 6)**:
   - 3 creation modes: Recreate Source Paper (uses original questions detected in Phase 5), Generate Practice Exam (source-grounded AI synthesis), and Mixed Exam (50/50 hybrid).
   - In-studio question editor: preview, edit stem/options, regenerate individual questions, delete, and reorder.
   - Integrity verification: duplicate detection, option consistency, answer key presence, manual review flags.
   - Published immutable snapshot (`exam_snapshots`) completely decoupling active attempts from template edits.
   - Answer keys and worked solutions strictly stripped from active exam payloads.
3. **AI Document Intelligence Pipeline (Phase 5)**:
   - Bounded 6-stage analysis: Curriculum Classification, Topic Hierarchy with Citations, Question & Option Detection, Warnings & Answer Key Checks, Content Map & Gaps, Schema-Validated Checkpoint Persistence.
   - Long document chunking with overlap & source-preserving merging without question loss.
   - Prompt-injection defense: XML entity delimiter escaping and pattern scanner.
   - Material analysis workspace (`/dashboard/materials/[id]`) with candidate metadata correction and mistake flagging.
4. **Secure Document Ingestion (Phase 4)**:
   - PDF upload workflow with `%PDF-` magic-byte validation, 20MB limit, and private Supabase Storage isolation (`materials/{user_id}/{uuid}.pdf`).
   - Background processing queue with state machine (`queued` -> `processing` -> `completed` / `retryable` / `failed`).
   - Page-by-page text extraction via `unpdf`, low-text density detection, and OCR fallback interface.
5. **Backend & Security Foundation (Phase 3)**:
   - Supabase Auth integration with HTTP-only cookies, protected edge routes, and session restoration.
   - Version-controlled PostgreSQL migrations with strict RLS policies on all tables.
   - Isolated admin-role authorization model with DB triggers preventing self-privilege elevation.
6. **Academic-Tech Visual Identity (Phase 2)**:
   - High-contrast slate and indigo UI, responsive across mobile, tablet, and desktop.
   - Accessible primitives: dialogs, dropzones, skeletons, toasts, and score gauges.
7. **Architecture & Scaffolding (Phase 1)**:
   - Next.js 16 App Router, TypeScript 5, Tailwind CSS v4, Vitest with 180 automated tests.
   - Distraction-free CBT exam runner (`/exam/[id]`) decoupled from navigation.
   - Exam answer keys protected server-side and never sent to clients prior to submission.

---

## 🛠 Tech Stack

- **Framework**: Next.js 16.4.3 (App Router, Turbopack, Partial Prerendering, Cache Components)
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **UI Primitives**: Radix UI primitives & custom accessible components (`components/ui/`)
- **Backend / Auth**: Supabase Auth & PostgreSQL (prepared for Phase 3/4)
- **Validation**: Zod v3 schemas (`lib/schemas/`)
- **Testing**: Vitest, React Testing Library, jsdom

---

## 📁 Repository Structure

```text
├── app/
│   ├── (admin)/
│   │   ├── admin/page.tsx               # Admin moderation and document queue
│   │   └── layout.tsx                   # Dedicated staff navigation layout
│   ├── (auth)/
│   │   ├── login/page.tsx               # Sign-in with credentials & OAuth
│   │   ├── register/page.tsx            # Candidate registration
│   │   ├── sign-in/page.tsx             # Alias to login
│   │   ├── sign-up/page.tsx             # Alias to register
│   │   ├── forgot-password/page.tsx     # Password recovery flow
│   │   └── layout.tsx                   # Centered authentication shell
│   ├── (dashboard)/
│   │   ├── analytics/page.tsx           # Subject mastery, pacing, diagnostics
│   │   ├── exams/builder/page.tsx       # 4-step wizard to configure CBT mocks
│   │   ├── materials/
│   │   │   ├── page.tsx                 # Upload dropzone & materials catalog
│   │   │   └── [id]/page.tsx            # Syllabus & question analysis
│   │   ├── settings/page.tsx            # CBT preferences, timers, profile
│   │   ├── profile/page.tsx             # Account settings
│   │   ├── page.tsx                     # Student dashboard & score trajectory
│   │   └── layout.tsx                   # Dashboard layout with responsive sidebar
│   ├── (exam)/
│   │   ├── exam/[id]/page.tsx           # Distraction-free CBT Exam Runner
│   │   ├── exam/[id]/results/page.tsx   # Authenticated score report & review
│   │   └── layout.tsx                   # Isolated exam workstation shell
│   ├── error.tsx                        # Global error boundary
│   ├── global-error.tsx                 # Critical root error boundary
│   ├── not-found.tsx                    # Accessible 404 page
│   ├── layout.tsx                       # Root HTML shell & font providers
│   └── page.tsx                         # Public landing page & interactive preview
├── components/
│   ├── auth/                            # Auth forms (login, register, forgot-pwd)
│   ├── layout/                          # Desktop sidebar & mobile navigation drawer
│   └── ui/                              # Reusable primitives (button, badge, card, etc.)
├── docs/
│   ├── architecture.md                  # System design, data flow, component hierarchy
│   ├── product-spec.md                  # Product requirements, personas, examination boards
│   ├── security.md                      # Security model, threat analysis, answer-key safeguards
│   └── deployment.md                    # Production environment, CI/CD, Supabase config
├── lib/
│   ├── env.ts                           # Typed runtime environment variable validation
│   ├── fixtures/
│   │   └── mock-data.ts                 # Isolated typed mock fixtures for UI & tests
│   ├── schemas/                         # Zod validation contracts
│   ├── supabase/                        # Client, Server, and Proxy Supabase helpers
│   └── utils/                           # Formatting, timing, and cn helpers
├── types/
│   └── supabase.ts                      # Strict PostgREST table & relationship types
├── proxy.ts                             # Next.js 16 request proxy & auth guard
└── vitest.config.ts                     # Unit and component test configuration
```

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js 20+
- pnpm 9+

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Provide the standard Supabase credentials (for local dev, safe placeholders allow build and tests to succeed).

### 3. Installation
```bash
pnpm install
```

### 4. Running the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to explore the public landing page and CBT preview.

---

## 🧪 Verification & Testing

StudPilot enforces strict type checks, linting, and automated unit/component tests:

```bash
# Run Vitest test suite (75 passing tests)
pnpm test

# Run TypeScript strict type-check
pnpm type-check

# Run ESLint
pnpm lint

# Run Next.js production build with Turbopack & Partial Prerendering
pnpm build
```

---

## 🔒 Security Posture

1. **No Client Answer Key Leakage**: The CBT Exam Runner receives question stems and options only. Answer keys and rationales are stored server-side and only returned after authenticated submission.
2. **Untrusted Document Ingestion**: Uploaded PDFs and extracted syllabus text are treated as untrusted data inputs. They are sanitized before LLM context framing.
3. **Strict Validation**: All client and server environment variables are validated at boot with Zod.
