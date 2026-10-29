/**
 * Server-Side Authorization Helpers & Guard Utilities
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * Enforces authenticated session checks, ownership verification, and role-based
 * access controls across server actions, route handlers, and data operations.
 *
 * Rules:
 * 1. Never trust user-provided UUIDs or client ownership assertions.
 * 2. Authenticated user ID is always resolved from the verified session JWT (auth.getUser()).
 * 3. Cross-user access is blocked unless the authenticated user is an administrator.
 * 4. Students can never elevate their own role to administrator.
 *
 * @module lib/auth/authorization
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type UserRole = "student" | "admin";

export interface AuthenticatedProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Authentication required to access this resource.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Access denied: You do not have permission to access this resource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Retrieves the currently authenticated Supabase user from the session cookie.
 * Does not trust any client-supplied user parameters.
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient<Database>
): Promise<{ id: string; email?: string } | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { id: user.id, email: user.email };
}

/**
 * Asserts that a request is authenticated.
 * Throws UnauthorizedError (401) if no active session exists.
 */
export async function requireUser(
  supabase: SupabaseClient<Database>
): Promise<{ id: string; email?: string }> {
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/**
 * Retrieves the authenticated user and their corresponding database profile.
 */
export async function getAuthenticatedProfile(
  supabase: SupabaseClient<Database>
): Promise<AuthenticatedProfile | null> {
  const user = await getAuthenticatedUser(supabase);
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    ...profile,
    email: user.email,
  };
}

/**
 * Asserts that the authenticated user possesses administrator privileges.
 * Throws UnauthorizedError (401) if unauthenticated, or ForbiddenError (403)
 * if the user role is not 'admin'.
 */
export async function requireAdmin(
  supabase: SupabaseClient<Database>
): Promise<AuthenticatedProfile> {
  const profile = await getAuthenticatedProfile(supabase);
  if (!profile) {
    throw new UnauthorizedError("Sign in required to perform administrative actions.");
  }

  if (profile.role !== "admin") {
    throw new ForbiddenError("Administrative privileges required.");
  }

  return profile;
}

/**
 * Asserts that a given resource owner matches the currently authenticated user,
 * or that the caller is an administrator.
 */
export function assertResourceOwnership(
  ownerId: string,
  currentUserId: string,
  isAdmin = false
): void {
  if (ownerId !== currentUserId && !isAdmin) {
    throw new ForbiddenError("Cross-user access denied: You cannot access or modify records owned by another student.");
  }
}

/**
 * Verifies that the authenticated user has access to a specific document.
 * Queries the database record to confirm ownership rather than relying on client input.
 */
export async function verifyDocumentAccess(
  supabase: SupabaseClient<Database>,
  documentId: string,
  currentUserId: string,
  isAdmin = false
): Promise<{ id: string; uploader_id: string; filename: string; storage_path: string }> {
  const { data: document, error } = await supabase
    .from("documents")
    .select("id, uploader_id, filename, storage_path")
    .eq("id", documentId)
    .single();

  if (error || !document) {
    throw new ForbiddenError("Document not found or access denied.");
  }

  assertResourceOwnership(document.uploader_id, currentUserId, isAdmin);
  return document;
}

/**
 * Verifies that the authenticated user owns a given examination session.
 */
export async function verifyExamSessionAccess(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  currentUserId: string,
  isAdmin = false
): Promise<{ id: string; student_id: string; status: string; subject_id: string }> {
  const { data: session, error } = await supabase
    .from("exam_sessions")
    .select("id, student_id, status, subject_id")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    throw new ForbiddenError("Examination session not found or access denied.");
  }

  assertResourceOwnership(session.student_id, currentUserId, isAdmin);
  return session;
}

/**
 * Verifies storage path authorization for private materials.
 * The path MUST adhere to the pattern `{user_id}/{filename}` and must not contain
 * path-traversal sequences (`..`).
 */
export function verifyStoragePathAccess(
  storagePath: string,
  currentUserId: string,
  isAdmin = false
): boolean {
  // Reject path traversal attempts
  if (storagePath.includes("..") || storagePath.startsWith("/") || storagePath.includes("\\")) {
    throw new ForbiddenError("Invalid storage path format.");
  }

  // Path must start with `{currentUserId}/` unless administrator
  const segments = storagePath.split("/");
  if (segments.length < 2 || !segments[0] || !segments[1]) {
    throw new ForbiddenError("Storage path must include user namespace: {userId}/{filename}.");
  }

  const pathUserId = segments[0];
  if (pathUserId !== currentUserId && !isAdmin) {
    throw new ForbiddenError("Storage authorization failure: Cannot access files outside your personal user namespace.");
  }

  return true;
}

/**
 * Validates that a user cannot self-elevate their role to administrator.
 */
export function preventRoleSelfElevation(
  requestedRole: string | undefined,
  currentRole: UserRole
): void {
  if (requestedRole && requestedRole !== currentRole && currentRole !== "admin") {
    throw new ForbiddenError("Students are prohibited from granting themselves administrative access.");
  }
}

