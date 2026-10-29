# Architecture — StudPilot

> Last updated: October 2026

## 1. System Overview

StudPilot is an AI-powered Computer-Based Testing (CBT) and diagnostic preparation platform built with **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS**, **Supabase**, and schema-validated AI question generation.

The platform architecture is divided into distinct execution domains:

1. **Presentation & Workstation Layer**:
   - **Student Dashboard Shell** (`app/(dashboard)/`): Standard authenticated navigation, study materials, score analytics, exam builder wizard.
   - **Distraction-Free Exam Workstation** (`app/(exam)/`): Isolated, distraction-free environment for taking timed CBT exams. Bypasses general application navigation to prevent candidate distraction and maintain testing focus.
   - **Administrative Console** (`app/(admin)/`): Staff workspace for syllabus management, document processing queues, and system audits.
   - **Public Portal** (`app/page.tsx`, `app/(auth)/`): Landing page with interactive CBT preview, authentication flows, and onboarding.

2. **Application & Routing Layer**:
   - Next.js 16 App Router utilizing Turbopack, Partial Prerendering (PPR), and Cache Components.
   - Edge request proxy (`proxy.ts`) enforcing authenticated route boundaries.
   - Server Actions and Route Handlers for state mutations and exam grading.

3. **Data Layer (Supabase)**:
   - PostgreSQL with strict Row Level Security (RLS) on all user tables.
   - Supabase Auth for JWT-based session management and profile linking.
   - Supabase Storage with private buckets and time-limited signed URLs for document access.

4. **AI Generation Layer**:
   - Server-side only LLM invocations using Google Gemini structured outputs.
   - Untrusted text sanitization pipeline to prevent prompt injection from user-uploaded PDFs.

---

## 2. Component Hierarchy & Directory Layout

```text
app/
├── (admin)/
│   ├── admin/page.tsx                  # Document ingestion queue & question bank audit
│   └── layout.tsx                      # Admin header with staff privilege indicators
├── (auth)/
│   ├── login/page.tsx                  # Email/password & Google OAuth
│   ├── register/page.tsx               # Student registration & exam board targeting
│   ├── sign-in/page.tsx                # Alias route to login
│   ├── sign-up/page.tsx                # Alias route to register
│   ├── forgot-password/page.tsx        # Password reset request
│   └── layout.tsx                      # Centered card layout
├── (dashboard)/
│   ├── page.tsx                        # Student overview, readiness gauge, score chart
│   ├── materials/
│   │   ├── page.tsx                    # Drag-and-drop upload & material grid
│   │   └── [id]/page.tsx               # Document analysis, topics, difficulty distribution
│   ├── exams/
│   │   └── builder/page.tsx            # 4-step wizard: subjects -> count -> time -> review
│   ├── analytics/page.tsx              # Diagnostic mastery, pacing, session history
│   ├── settings/page.tsx               # CBT preferences, timer alerts, font scaling
│   ├── profile/page.tsx                # User account settings
│   └── layout.tsx                      # Server Component wrapping DashboardNav in Suspense
├── (exam)/
│   ├── exam/[id]/page.tsx              # CBT Exam Runner: countdown, palette, option cards
│   ├── exam/[id]/results/page.tsx      # Performance score, pacing, rationales
│   └── layout.tsx                      # Distraction-free dark workstation (slate-950)
├── error.tsx                           # Global error boundary with retry CTA
├── global-error.tsx                    # Root HTML error fallback
├── not-found.tsx                       # Custom 404 with navigation back home
├── layout.tsx                          # Root layout with Geist fonts
└── page.tsx                            # Public landing page with interactive CBT preview

components/
├── auth/                               # Login, register, forgot-password forms
├── layout/                             # Dashboard navigation (desktop sidebar & mobile drawer)
└── ui/                                 # Reusable design system primitives
    ├── button.tsx                      # Button with variants (default, outline, ghost, etc.)
    ├── input.tsx                       # Accessible text inputs with focus rings
    ├── label.tsx                       # Accessible form labels
    ├── badge.tsx                       # Multi-variant badge (success, warning, indigo, etc.)
    ├── card.tsx                        # Container cards (Header, Title, Description, Content)
    ├── dialog.tsx                      # Accessible modal dialogs with backdrop blur
    ├── dropzone.tsx                    # Drag-and-drop file uploader with validation
    ├── progress.tsx                    # Animated progress indicators
    ├── skeleton.tsx                    # Loading placeholder skeletons
    ├── spinner.tsx                     # Loading spinners
    └── tabs.tsx                        # Accessible tabbed navigation

lib/
├── env.ts                              # Runtime Zod validation for client & server env vars
├── fixtures/
│   └── mock-data.ts                    # Strongly typed mock fixtures for UI & tests
├── schemas/                            # Zod schemas for auth, questions, and exams
├── supabase/                           # Client, Server, and Proxy Supabase SDK clients
└── utils/                              # Formatting, timing, and tailwind merge helpers
```

---

## 3. Data Flow & Security Boundaries

### 3.1 Exam Session Lifecycle
1. **Creation**: Student configures exam parameters in `/dashboard/exams/builder`. A session record is created in `exam_sessions`.
2. **Execution**: Student navigates to `/exam/[id]`. Questions are rendered **without** answer keys or rationales (`correct_option` and `explanation` are omitted from the client payload).
3. **Submission**: When the student clicks submit or the timer expires, client answers are sent to the server for evaluation.
4. **Scoring**: Server-side grading evaluates candidate choices against the secure answer key in PostgreSQL, writes the result to `exam_submissions`, and redirects the candidate to `/exam/[id]/results`.
5. **Review**: The results page displays the verified score, pacing metrics, and pedagogical rationales.

### 3.2 Document Processing & Ingestion Pipeline
1. **Upload & Pre-Validation**: Candidate selects a PDF file. Client-side checks enforce the 20MB limit and PDF format.
2. **Binary Header Verification**: Server action `uploadDocumentAction` inspects the initial byte stream to verify standard `%PDF-` magic bytes (`0x25 0x50 0x44 0x46 0x2D`), strictly rejecting spoofed or executable files.
3. **Safe Storage Path Generation**: Files are assigned a random UUID `documentId` and stored at `materials/${userId}/${documentId}.pdf`. Original user filenames are retained as metadata only.
4. **Idempotent Background Ingestion Job**: A job record is created in `document_processing_jobs` (`queued` -> `processing` -> `completed` / `retryable` / `failed`).
5. **Text Extraction**: Text is extracted page-by-page via `unpdf`, preserving document order and page numbers in `document_pages`.
6. **Low-Text & Scanned Image Detection**: Pages with low word counts (< 15 words) are flagged with extraction warnings, and scanned documents trigger the pluggable `OcrProvider` fallback interface.
7. **Per-Page Text Preview**: Candidates inspect verified text segments on `/dashboard/materials/[id]`, retry failed extractions, or preview original files via secure 1-hour signed URLs.
8. **Rate Limiting**: Candidates are limited to a configurable maximum (10 uploads/hour) via `checkUploadRateLimit`.

### 3.3 AI Document Intelligence Pipeline (Phase 5)

The AI Document Intelligence pipeline processes ingested syllabus materials and past questions through a bounded, resilient 6-stage architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Ingested PDF Text Pages                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 1: Classification & Exam Board Inference                         │
│ • Infers subject, educational level, exam type (JAMB, WAEC, NECO, etc.)│
│ • Assigns confidence rating and rationale                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Checkpoint saved
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 2: Topic & Subtopic Hierarchy Extraction                         │
│ • Multi-page bounded chunking with 1-page overlap                      │
│ • Citations and verbatim evidence references mapped per subtopic       │
│ • Hierarchies merged and consolidated without loss                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Checkpoint saved
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 3: Question, Option, & Answer Key Detection                      │
│ • Detects stems, numbered options (A-D), instructions, marks, equations │
│ • Validates question completeness (flags missing stems or options)     │
│ • Preserves distinct questions across sections (Section A vs B Q1)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Checkpoint saved
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 4: Source References & Extraction Warnings                       │
│ • Aggregates page-level warnings for incomplete questions              │
│ • Flags missing answer keys and low-confidence extractions             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Checkpoint saved
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 5: Content Map & Gap Analysis                                    │
│ • Calculates estimated syllabus coverage percentage                    │
│ • Highlights uncovered prerequisite knowledge and topic gaps           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Checkpoint saved
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 6: Schema Validation & Checkpointed Report Persistence           │
│ • Complete `MaterialIntelligenceReport` validated against Zod schema   │
│ • Versioned record stored in `material_analyses` with RLS isolation    │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Provider Abstraction (`lib/ai/provider.ts`)**:
   - `AIProvider` interface decoupled from specific LLM models.
   - Official `GoogleGenAI` SDK (`@google/genai`) implementation targeting Gemini 2.5 Flash with structured JSON output mode.
   - Server-side timeouts (30s default) with exponential backoff retry.
   - Deterministic `MockAIProvider` for test suites and offline development.
2. **Untrusted Evidence Framing (`lib/ai/prompt-safety.ts`)**:
   - Extracted text is framed inside XML-delimited `<document_evidence>` blocks.
   - Delimiter tags in student documents are systematically escaped (`</document_evidence>` -> `&lt;/document_evidence&gt;`) to prevent prompt breakout.
   - Heuristic injection scanner detects jailbreak patterns, system prompt overrides, and credential probing.
3. **Resumability & Checkpointing**:
   - Intermediate outputs are serialized to `stage_checkpoints` JSONB column in `material_analyses`.
   - Failed or interrupted jobs can resume directly from their latest valid stage checkpoint without re-running upstream LLM calls.
4. **Candidate Feedback Loop (`material_corrections`)**:
   - Candidates can edit inferred classification metadata (e.g. correct subject or educational level).
   - Candidates can flag extraction mistakes on individual questions or options, creating versioned audit records for continuous model evaluation.
