# Product Specification — StudPilot

> Version 1.0 · Last updated: October 2026

---

## 1. Problem Statement

Students preparing for high-stakes standardized and professional examinations in West Africa (such as JAMB UTME, WAEC WASSCE, NECO SSCE, and ICAN) face three critical bottlenecks:
1. **Generic, Static Question Banks**: Existing platforms cycle through decades-old past questions with no contextual alignment to the candidate's active reading syllabus or course notes.
2. **Poor CBT Exam Simulation**: Practice tests often do not match the cognitive pressure, pacing constraints, or navigation paradigms of actual computer-based testing centers.
3. **Absence of Actionable Diagnostics**: Students receive only a percentage score rather than detailed pacing analysis, syllabus topic weaknesses, and pedagogical answer explanations.

StudPilot solves this by allowing students to upload textbooks, lecture slides, and notes, and automatically synthesizing them into timed, high-fidelity CBT exam simulations with instant diagnostic reporting.

---

## 2. Target Examination Boards & Personas

| Exam Board | Candidate Persona | Target Format |
|---|---|---|
| **JAMB UTME** | University matriculation candidate | 4 subjects, 40-60 MCQs per subject, strict 120-minute timer |
| **WAEC WASSCE** | Senior Secondary School terminal candidate | Objective papers (Paper 1), syllabus-focused MCQs |
| **NECO SSCE** | Senior Secondary School certificate candidate | Objective papers, curriculum-aligned questions |
| **ICAN** | Accounting professional trainee | Foundation & skills level objective and case-based MCQs |

---

## 3. Core User Journeys

### Student Journey

```
Register / Login
    │
    ▼
Browse Subjects
    │
    ▼
Start Practice Exam (pick subject + question count + time limit)
    │
    ▼
CBT Interface (timer, question navigator, flag for review)
    │
    ▼
Submit Exam
    │
    ▼
View Results (score, per-question review, explanations)
    │
    ▼
Dashboard Analytics (progress over time, weak subjects)
```

### Admin Journey

```
Login (admin role)
    │
    ▼
Create/Edit Subjects
    │
    ▼
Upload Study Documents (PDF/DOCX per subject)
    │
    ▼
Monitor AI Processing Status
    │
    ▼
Review & Approve Generated Questions
    │
    ▼
Manage Question Bank (edit, delete, adjust difficulty)
```

---

## 4. Feature Specifications

### 4.1 Authentication

| Feature | Spec |
|---|---|
| Registration | Email + password. Confirm email before access. |
| Login | Email + password. "Remember me" option. |
| OAuth | Google Sign-In (Phase 1+) |
| Forgot Password | Magic link sent to email |
| Session | HTTP-only cookie, 7-day expiry |

### 4.2 Subjects

| Feature | Spec |
|---|---|
| Subject creation | Admin only. Fields: name, code (e.g. ENG101), description, colour tag. |
| Subject listing | All authenticated users. Shows document count and question count. |
| Subject deletion | Admin only. Soft-delete (archived flag). |

### 4.3 Document Upload & AI Intelligence Analysis

| Feature | Spec |
|---|---|
| Upload formats | PDF up to 20 MB with magic-byte binary header verification |
| Storage | Private Supabase Storage bucket (`materials/{userId}/{uuid}.pdf`) |
| Ingestion pipeline | `queued` → `processing` → `completed` / `retryable` / `failed` |
| Text extraction | Page-level text extraction with low-text density detection and OCR fallback interface |
| AI Classification | Infers subject, educational level, examination board (JAMB, WAEC, NECO, ICAN), and confidence |
| Topic Hierarchy | Multi-level topic and subtopic extraction with verbatim evidence citations and page references |
| Question Detection | Scans for original exam questions, options (A-D), marks, equations, answer keys, and completeness |
| Warnings & Gaps | Highlights incomplete questions, missing keys, and estimated syllabus coverage % |
| Resumability | Checkpoints saved per stage; retries resume without repeating upstream LLM stages |
| Candidate Feedback | Students can correct inferred metadata and flag extraction mistakes |

### 4.4 Exam Configuration Studio (Phase 6)

| Feature | Spec |
|---|---|
| Creation Modes | Recreate Source Paper, Generate Practice Exam, Mixed Exam (50/50 hybrid) |
| Question Count | 5 to 100 questions with source availability validation |
| Question Types | Single-choice MCQ (A-D) and True/False |
| Marking Scheme | Configurable positive marks (0.5 to 10) and negative marks (-0.25 to -1.0) |
| Difficulty Tuning | Easy / Medium / Hard percentage distribution |
| Studio Editing | In-studio preview, edit stem/options, regenerate single question, delete, reorder |
| Integrity Checks | Duplicate detection, option consistency, answer key presence, manual review flags |
| Immutability | Published immutable snapshot (`exam_snapshots`) before attempt execution |

### 4.5 CBT Examination Runner (Phase 7)

| Feature | Spec |
|---|---|
| Workstation Shell | Distraction-free workstation, dark palette (slate-950), optional fullscreen mode |
| Instructions | Pre-exam testing rules, duration, negative marking warning, start confirmation |
| Question Palette | Color-coded status: Answered (emerald), Unanswered (slate), Review (amber), Current (indigo) |
| Keyboard Support | Numeric keys (1-4) or letters (A-D) for options; Arrow keys for navigation |
| Autosave Engine | Debounced (500ms) with save status badge (`Saving...`, `All answers saved`, `Offline`) |
| Deadline Control | Server-authoritative deadline (`expires_at`), auto-finalization on timeout |
| Anti-Key-Leak | Server strips `correctOptionId` and worked explanations from active attempt responses |
| Submission Safety | Confirmation dialog with unanswered breakdown; idempotent finalization |

### 4.6 Results & Worked Explanations

| Feature | Spec |
|---|---|
| Scoring & Marks | Percentage, earned marks vs max marks, negative marking deductions |
| Diagnostics | Correct count, incorrect count, unanswered count, pacing (seconds / MCQ) |
| Solution Review | Complete worked solutions, distractor explanations, source page citations |
| Next Actions | Retake test or return to Student Dashboard |

### 4.7 Analytics Dashboard

| Feature | Spec |
|---|---|
| Overview cards | Total sessions, average score, best subject, questions answered |
| Score trend | Line chart: score over last 10 sessions |
| Subject breakdown | Bar chart: average score per subject |
| Weak areas | List of questions the student has answered incorrectly most |

---

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load (LCP) | < 2.5s on 4G |
| Time To First Byte | < 200ms (Vercel Edge) |
| AI question generation | < 30s per document (background) |
| Availability | 99.5% uptime |
| Accessibility | WCAG 2.1 AA |
| Mobile support | Fully responsive; exam UI usable on 375px width |

---

## 6. UI Design Principles

- **Clean, distraction-free** exam interface — no nav, ads, or animations during exam
- **High contrast** for readability — minimum 4.5:1 contrast ratio
- **Large tap targets** — minimum 44×44px for mobile
- **Progress always visible** — time remaining and question progress persistent
- **Dark mode** — system preference respected via `prefers-color-scheme`

---

## 7. Out of Scope (v1)

- Payment / subscription
- Student social features
- Instructor-created custom exams (non-AI)
- Mobile native app
- Offline mode

