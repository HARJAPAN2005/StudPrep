# StudPilot · AI-Powered CBT Examination Preparation Platform

> **StudPilot** is a high-stakes Computer-Based Testing (CBT) and diagnostic preparation platform tailored for West African and professional examinations (JAMB UTME, WAEC WASSCE, NECO SSCE, and ICAN). It turns raw study materials and past questions into rigorous, timed exam simulations with instant diagnostic feedback.

---

## 🚀 Key Features (Phases 1 & 2 Completed)

1. **Academic-Tech Visual Identity**:
   - Clean, professional design system with high-contrast slate palettes, indigo primary accents, and emerald/amber indicators.
   - Fully responsive layouts across Mobile (375px), Tablet (768px), and Desktop (1280px+).
   - Fluid typography with Geist and Geist Mono.

2. **Distraction-Free CBT Exam Runner** (`/exam/[id]`):
   - Fully decoupled from the main dashboard shell to eliminate navigation distraction.
   - Interactive live countdown timer with urgency threshold alerting.
   - 4-option single-select response matrix with keyboard-accessible triggers.
   - Question review palette showing answered, unanswered, and flagged questions.
   - Auto-submit on timer expiry and double-confirmation submission dialog.

3. **CBT Scoring & Results Report** (`/exam/[id]/results`):
   - Visual score percentage gauge and percentile tier benchmark.
   - Pacing metrics (seconds per MCQ) and total time expended.
   - Question-by-question review with pedagogical rationales and correct answer keys.
   - Strict security: Correct answer keys and model rationales are never delivered to the client prior to exam submission.

4. **Student Diagnostic Dashboard** (`/dashboard`):
   - Readiness score gauge with past 30 days score trajectory SVG chart.
   - Subject-level accuracy breakdown across Mathematics, English, Physics, and Chemistry.
   - Quick launch for active study materials and recent mock sessions.

5. **Study Material Library & Analysis** (`/dashboard/materials`, `/dashboard/materials/[id]`):
   - Drag-and-drop file upload dropzone supporting PDF, DOCX, and TXT (client-side validation for type and 20MB size limits).
   - Status tracking (`Ready`, `Analyzing`, `Draft`).
   - Deep-dive document analysis view showing syllabus coverage, extracted key topics, and difficulty distribution (Easy / Medium / Hard).

6. **Step-Based Exam Builder Wizard** (`/dashboard/exams/builder`):
   - Step 1: Select Subjects & Uploaded Reference Materials.
   - Step 2: Configure Question Count & Difficulty Weighting.
   - Step 3: Configure Time Limits & Exam Engine Modes (Strict Timed CBT vs Practice Mode).
   - Step 4: Review Configuration & Launch Runner.

7. **Security Architecture & Infrastructure**:
   - Strict runtime environment variable validation using Zod (`lib/env.ts`).
   - Next.js 16 Proxy layer (`proxy.ts`) enforcing authenticated route boundaries.
   - Typed PostgREST database contracts (`types/supabase.ts`).
   - Mock data isolated strictly behind typed interfaces (`lib/fixtures/mock-data.ts`).

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
