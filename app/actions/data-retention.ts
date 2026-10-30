"use server";

/**
 * Data Retention & Privacy Management Actions
 *
 * ⚠️ PRIVACY & SECURITY CRITICAL ⚠️
 * Enforces student data ownership, GDPR-compliant data export, and
 * irreversible cascade deletion of accounts and uploaded materials.
 *
 * Rules:
 * 1. Only the resource owner or an administrator can delete materials.
 * 2. Material deletion removes both database metadata and private storage blobs.
 * 3. Data export packages all student telemetry without exposing internal keys.
 * 4. All admin-initiated data modifications are logged to admin_audit_logs.
 *
 * @module app/actions/data-retention
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, assertResourceOwnership } from "@/lib/auth/authorization";
import { recordAdminAuditLog } from "@/app/actions/admin";
import { INGESTION_CONFIG } from "@/lib/ingestion/config";

/**
 * Deletes a study material document and purges its stored binary file from private storage.
 * Verifies that the caller owns the document or holds administrator privileges.
 */
export async function deleteStudyMaterialAction(
  materialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Fetch user profile to check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    // Retrieve document record
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("id, uploader_id, storage_path, filename")
      .eq("id", materialId)
      .single();

    if (fetchError || !document) {
      return { success: false, error: "Study material not found or access denied." };
    }

    // Assert ownership unless administrator
    assertResourceOwnership(document.uploader_id, user.id, isAdmin);

    // 1. Remove file from private storage bucket
    if (document.storage_path) {
      const { error: storageError } = await supabase.storage
        .from(INGESTION_CONFIG.STORAGE_BUCKET)
        .remove([document.storage_path]);

      if (storageError) {
        console.warn("[data-retention] Storage cleanup warning:", storageError.message);
      }
    }

    // 2. Delete database record (cascades via foreign keys)
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", materialId);

    if (deleteError) {
      return { success: false, error: "Failed to remove material records from database." };
    }

    // 3. If deleted by an administrator, log consequential action to audit trail
    if (isAdmin && document.uploader_id !== user.id) {
      await recordAdminAuditLog(supabase, {
        adminId: user.id,
        action: "delete_study_material",
        targetType: "document",
        targetId: materialId,
        details: {
          originalOwnerId: document.uploader_id,
          filename: document.filename,
          storagePath: document.storage_path,
        },
      });
    }

    try {
      revalidatePath("/dashboard/materials");
    } catch {
      // Ignored outside Next.js request context (e.g. unit tests)
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[data-retention] deleteStudyMaterialAction error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Generates a complete GDPR-compliant JSON package of the student's personal data,
 * uploaded document metadata, examination attempts, and integrity logs.
 */
export async function exportStudentDataAction(): Promise<{
  success: boolean;
  export?: {
    generatedAt: string;
    studentId: string;
    profile: {
      id: string;
      fullName: string | null;
      role: string;
      avatarUrl: string | null;
      createdAt: string;
    } | null;
    documents: Array<{
      id: string;
      filename: string;
      fileSize: number;
      mimeType: string;
      status: string;
      createdAt: string;
    }>;
    examAttempts: Array<{
      id: string;
      snapshotId: string;
      status: string;
      score: number | null;
      accuracy: number | null;
      timeSpentSeconds: number;
      submittedAt: string | null;
      createdAt: string;
    }>;
    integrityEventsCount: number;
    disclaimer: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // 1. Student profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url, created_at")
      .eq("id", user.id)
      .single();

    // 2. Documents uploaded by student
    const { data: documents } = await supabase
      .from("documents")
      .select("id, filename, file_size, mime_type, status, created_at")
      .eq("uploader_id", user.id);

    // 3. Finalized and active exam attempts
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select("id, snapshot_id, status, score, accuracy, time_spent_seconds, submitted_at, created_at")
      .eq("student_id", user.id);

    // 4. Integrity events count
    const { count: integrityEventsCount } = await supabase
      .from("exam_integrity_events")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id);

    return {
      success: true,
      export: {
        generatedAt: new Date().toISOString(),
        studentId: user.id,
        profile: profile
          ? {
              id: profile.id,
              fullName: profile.full_name,
              role: profile.role,
              avatarUrl: profile.avatar_url,
              createdAt: profile.created_at,
            }
          : null,
        documents: (documents ?? []).map((d) => ({
          id: d.id,
          filename: d.filename,
          fileSize: d.file_size,
          mimeType: d.mime_type,
          status: d.status,
          createdAt: d.created_at,
        })),
        examAttempts: (attempts ?? []).map((a) => ({
          id: a.id,
          snapshotId: a.snapshot_id,
          status: a.status,
          score: a.score,
          accuracy: a.accuracy,
          timeSpentSeconds: a.time_spent_seconds,
          submittedAt: a.submitted_at,
          createdAt: a.created_at,
        })),
        integrityEventsCount: integrityEventsCount ?? 0,
        disclaimer:
          "This machine-readable personal data export is provided pursuant to data privacy rights. " +
          "No internal cryptographic hashes or answer keys are included.",
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[data-retention] exportStudentDataAction error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Permanently deletes the student's account, removing personal storage files
 * and deleting profile records. Database cascading foreign keys remove dependent rows.
 */
export async function deleteStudentAccountAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // 1. Find and purge all private storage objects for this student
    const { data: docs } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("uploader_id", user.id);

    const storagePaths = (docs ?? [])
      .map((d) => d.storage_path)
      .filter(Boolean);

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(INGESTION_CONFIG.STORAGE_BUCKET)
        .remove(storagePaths);

      if (storageError) {
        console.warn("[data-retention] Account deletion storage cleanup warning:", storageError.message);
      }
    }

    // 2. Delete the profile record (cascades via foreign key to all user tables)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      return { success: false, error: "Failed to purge student profile records." };
    }

    // 3. Terminate auth session
    await supabase.auth.signOut();

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[data-retention] deleteStudentAccountAction error:", msg);
    return { success: false, error: msg };
  }
}
