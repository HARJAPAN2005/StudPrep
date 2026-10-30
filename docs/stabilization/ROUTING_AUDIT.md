# StudPrep — Routing Audit & Realignment Report

**Document Version**: 1.0.0  
**Date**: October 30, 2026  
**Status**: RESOLVED & VERIFIED  

---

## 1. Problem Statement & Root Cause

In Next.js App Router, parentheses in folder names indicate **Route Groups** (e.g. `(dashboard)`, `(auth)`, `(exam)`). Route groups provide layout isolation and logical grouping, but they **do not contribute segments to the URL pathname**.

Prior to this stabilization sprint, the repository layout contained:
- `app/page.tsx` -> resolved to `/`
- `app/(dashboard)/page.tsx` -> resolved to `/` (Direct Route Collision!)
- `app/(dashboard)/materials/page.tsx` -> resolved to `/materials`
- `app/(dashboard)/materials/[id]/page.tsx` -> resolved to `/materials/[id]`
- `app/(dashboard)/exams/builder/page.tsx` -> resolved to `/exams/builder`
- `app/(dashboard)/analytics/page.tsx` -> resolved to `/analytics`
- `app/(dashboard)/profile/page.tsx` -> resolved to `/profile`
- `app/(dashboard)/settings/page.tsx` -> resolved to `/settings`
- `app/(dashboard)/subjects/page.tsx` -> resolved to `/subjects`

This caused multiple critical architectural failures:
1. **Root URL Ambiguity**: Both `app/page.tsx` (the public landing page) and `app/(dashboard)/page.tsx` (student workspace) claimed `/`.
2. **Broken Navigation Links**: Navigation components throughout the application (e.g., `components/layout/dashboard-nav.tsx`) linked to `/dashboard/materials`, `/dashboard/analytics`, and `/dashboard/exams/builder`. Because the actual route files were flattened to `/materials` and `/analytics`, navigating through the sidebar failed to match the server routes.
3. **Broken Revalidation Paths**: Server actions in `app/actions/documents.ts`, `exam-studio.ts`, and `intelligence.ts` called `revalidatePath("/dashboard/materials")`, which failed to invalidate the flattened `/materials` route.

---

## 2. Realignment Strategy

The student dashboard workspace was moved into a physical `dashboard` subfolder inside the `(dashboard)` layout group:

```
app/
├── (admin)/
│   └── admin/page.tsx               -> /admin
├── (auth)/
│   ├── login/page.tsx               -> /login
│   ├── register/page.tsx            -> /register
│   ├── sign-in/page.tsx             -> /sign-in
│   └── sign-up/page.tsx             -> /sign-up
├── (dashboard)/
│   ├── layout.tsx                   -> Wraps all /dashboard/* with DashboardNav
│   └── dashboard/
│       ├── page.tsx                 -> /dashboard
│       ├── analytics/page.tsx       -> /dashboard/analytics
│       ├── exams/builder/page.tsx   -> /dashboard/exams/builder
│       ├── materials/page.tsx       -> /dashboard/materials
│       ├── materials/[id]/page.tsx  -> /dashboard/materials/[id]
│       ├── profile/page.tsx         -> /dashboard/profile
│       ├── settings/page.tsx        -> /dashboard/settings
│       └── subjects/page.tsx        -> /dashboard/subjects
├── (exam)/
│   └── exam/
│       ├── [id]/page.tsx            -> /exam/[id]
│       └── [id]/results/page.tsx    -> /exam/[id]/results
├── page.tsx                         -> / (Sole Root Landing Page)
└── proxy.ts                         -> Edge Route & Role Guard
```

---

## 3. Canonical Route Verification Matrix

| Canonical URL Path | Physical File Location | Layout Group | Protection Level | Access Role |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `app/page.tsx` | Root | Public | Anonymous / Candidate |
| `/login` | `app/(auth)/login/page.tsx` | `(auth)` | Public Auth | Anonymous (Redirects if auth) |
| `/register` | `app/(auth)/register/page.tsx` | `(auth)` | Public Auth | Anonymous (Redirects if auth) |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | `(dashboard)` | Protected | Authenticated Student / Admin |
| `/dashboard/materials` | `app/(dashboard)/dashboard/materials/page.tsx` | `(dashboard)` | Protected | Authenticated Student / Admin |
| `/dashboard/materials/[id]`| `app/(dashboard)/dashboard/materials/[id]/page.tsx`| `(dashboard)` | Protected | Authenticated Student (Owner) |
| `/dashboard/exams/builder` | `app/(dashboard)/dashboard/exams/builder/page.tsx` | `(dashboard)` | Protected | Authenticated Student / Admin |
| `/dashboard/analytics` | `app/(dashboard)/dashboard/analytics/page.tsx` | `(dashboard)` | Protected | Authenticated Student (Self) |
| `/dashboard/profile` | `app/(dashboard)/dashboard/profile/page.tsx` | `(dashboard)` | Protected | Authenticated Student (Self) |
| `/dashboard/settings` | `app/(dashboard)/dashboard/settings/page.tsx` | `(dashboard)` | Protected | Authenticated Student (Self) |
| `/dashboard/subjects` | `app/(dashboard)/dashboard/subjects/page.tsx` | `(dashboard)` | Protected | Authenticated Student / Admin |
| `/admin` | `app/(admin)/admin/page.tsx` | `(admin)` | Staff Gate | Authenticated Staff (`role = 'admin'`) |
| `/exam/[id]` | `app/(exam)/exam/[id]/page.tsx` | `(exam)` | Protected Exam | Authenticated Candidate (Attempt Owner) |
| `/exam/[id]/results` | `app/(exam)/exam/[id]/results/page.tsx` | `(exam)` | Protected Results | Authenticated Candidate (Attempt Owner) |

---

## 4. Protected Route & Proxy Enforcement

In `proxy.ts`, `PROTECTED_ROUTES` includes `"/dashboard"` and `"/exam"`. Because the edge proxy evaluates `pathname.startsWith(route)`, all sub-routes under `/dashboard/*` and `/exam/*` are automatically gated:

```typescript
const PROTECTED_ROUTES = ["/dashboard", "/exam"];
const ADMIN_ROUTES = ["/admin"];

// If unauthenticated, redirects to /login?redirectTo={pathname}&error=unauthorized
if (isProtectedRoute && !user) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirectTo", pathname);
  loginUrl.searchParams.set("error", "unauthorized");
  return NextResponse.redirect(loginUrl);
}
```

All E2E tests in `e2e/critical-workflows.spec.ts` have been updated to target the canonical `/dashboard/*` URLs.

