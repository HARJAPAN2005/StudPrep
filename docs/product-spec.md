# Product Specification — StudPrep

> Version 0.1 · Last updated: 2026-10-29

---

## 1. Problem Statement

Students preparing for competitive examinations (JAMB, WAEC, NECO, ICAN, etc.) lack an affordable, personalised CBT practice environment that adapts to their study materials. Existing platforms use generic question banks that don't reflect an individual student's reading materials or weak areas.

---

## 2. Target Users

| Persona | Description |
|---|---|
| **Student** | SS3/Year 12 student, university student, or professional preparing for a certification exam. Primary user. |
| **Admin** | Exam tutor or platform operator who curates subjects, uploads materials, and reviews AI-generated questions. |

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

### 4.3 Document Upload & Processing

| Feature | Spec |
|---|---|
| Upload | PDF or DOCX up to 20 MB |
| Storage | Private Supabase Storage bucket |
| Processing states | pending → processing → ready / failed |
| AI generation | Up to 50 questions per document (configurable) |
| Status updates | Real-time via Supabase channel |

### 4.4 Question Bank

| Feature | Spec |
|---|---|
| Question format | 4-option MCQ |
| Fields | body, options[4], correct_index, explanation, difficulty, subject_id, source_page |
| Difficulties | easy, medium, hard |
| Admin review | Admin can edit any field, delete questions |
| Bulk actions | Select + delete multiple questions |

### 4.5 CBT Exam Session

| Feature | Spec |
|---|---|
| Session creation | Student picks subject, count (10/20/40), time limit |
| Time limit | Configurable per exam. Default: 2 min/question. Countdown displayed. |
| Question display | One at a time. Navigator panel shows all, flagged, and answered. |
| Flagging | Student can flag a question for review |
| Auto-submit | Session auto-submits when timer reaches zero |
| Anti-key-leak | `correct_index` NEVER sent to client during active session |
| Submission | Student can submit early. Confirmation dialog shown. |

### 4.6 Results & Explanations

| Feature | Spec |
|---|---|
| Score | Percentage + raw count (correct / total) |
| Per-question review | For each question: student answer, correct answer, explanation |
| Time analytics | Time spent per question |
| Retry | Button to start a new session for the same subject |

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

