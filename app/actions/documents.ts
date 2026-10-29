"use server";

/**
 * Document Ingestion & Management Server Actions
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * All operations require authenticated student sessions and perform strict
 * ownership verification prior to upload, retry, preview, or deletion.
 *
 * @module app/actions/documents
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, verifyDocumentAccess } from "@/lib/auth/authorization";
import { INGESTION_CONFIG } from "@/lib/ingestion/config";
import {
  inspectPdfBuffer,
  sanitizeFilename,
  generateInternalStoragePath,
} from "@/lib/ingestion/validation";
import { checkUploadRateLimit } from "@/lib/ingestion/rate-limiter";
import { processDocumentJob } from "@/lib/ingestion/processor";

export interface DocumentActionState {
  success?: boolean;
  message?: string;
  documentId?: string;
  error?: string;
}

/**
 * Uploads a study material PDF to private storage, creates database records,
 * and launches background text extraction.
 */
export async function uploadDocumentAction(
  formData: FormData
): Promise<DocumentActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // 1. Rate Limiting Check
  const rateLimit = checkUploadRateLimit(user.id);
  if (!rateLimit.allowed) {
    const minutes = Math.ceil(rateLimit.resetInMs / 60000);
    return {
      success: false,
      error: `Hourly upload limit reached (${INGESTION_CONFIG.MAX_UPLOADS_PER_USER_PER_HOUR} files/hr). Please try again in ${minutes} minutes.`,
    };
  }

  // 2. Extract and Validate File from FormData
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "Please select a valid PDF file to upload." };
  }

  const subjectId = (formData.get("subject_id") as string) || "00000000-0000-0000-0000-000000000001";

  // Validate file size limit
  if (file.size > INGESTION_CONFIG.MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(INGESTION_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return {
      success: false,
      error: `File size exceeds the allowable limit of ${maxMb} MB.`,
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 3. Inspect PDF binary magic bytes, encryption, and page limits
  const inspection = await inspectPdfBuffer(buffer);
  if (!inspection.valid) {
    return {
      success: false,
      error: inspection.error ?? "Invalid PDF document.",
    };
  }

  // 4. Generate Safe Internal Storage Path and Clean Metadata
  const documentId = crypto.randomUUID();
  const storagePath = generateInternalStoragePath(user.id, documentId);
  const cleanOriginalFilename = sanitizeFilename(file.name);

  // 5. Upload to Private Storage Bucket
  const { error: storageError } = await supabase.storage
    .from(INGESTION_CONFIG.STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (storageError) {
    console.error(`[UploadAction] Storage upload failure:`, storageError);
    return {
      success: false,
      error: `Storage upload failed: ${storageError.message}`,
    };
  }

  // 6. Insert Document Row in Database
  const { error: dbError } = await supabase.from("documents").insert({
    id: documentId,
    uploader_id: user.id,
    subject_id: subjectId,
    storage_path: storagePath,
    filename: cleanOriginalFilename,
    file_size: file.size,
    mime_type: "application/pdf",
    status: "pending",
    page_count: inspection.pageCount ?? null,
  });

  if (dbError) {
    console.error(`[UploadAction] DB insertion failure:`, dbError);
    // Cleanup orphaned storage file
    await supabase.storage.from(INGESTION_CONFIG.STORAGE_BUCKET).remove([storagePath]);
    return {
      success: false,
      error: "Failed to create document record in database.",
    };
  }

  // 7. Initialize Document Processing Job
  await supabase.from("document_processing_jobs").insert({
    document_id: documentId,
    uploader_id: user.id,
    status: "queued",
    max_attempts: INGESTION_CONFIG.MAX_PROCESSING_ATTEMPTS,
  });

  // 8. Execute Text Extraction Pipeline
  const processingResult = await processDocumentJob(supabase, documentId);

  revalidatePath("/dashboard/materials");
  revalidatePath(`/dashboard/materials/${documentId}`);

  return {
    success: true,
    documentId,
    message: processingResult.success
      ? `Material successfully uploaded and processed (${processingResult.pageCount ?? 0} pages).`
      : "Material uploaded. Text extraction is queued for processing.",
  };
}

/**
 * Retries text extraction for a failed or retryable document.
 */
export async function retryDocumentAction(
  documentId: string
): Promise<DocumentActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Verify ownership
  await verifyDocumentAccess(supabase, documentId, user.id);

  const result = await processDocumentJob(supabase, documentId, {
    forceRetry: true,
  });

  revalidatePath("/dashboard/materials");
  revalidatePath(`/dashboard/materials/${documentId}`);

  return {
    success: result.success,
    documentId,
    message: result.success
      ? "Processing retry completed successfully."
      : `Processing retry failed: ${result.error}`,
  };
}

/**
 * Deletes a study document, removing storage objects, extracted pages, and database records.
 */
export async function deleteDocumentAction(
  documentId: string
): Promise<DocumentActionState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Verify ownership
  const doc = await verifyDocumentAccess(supabase, documentId, user.id);

  // Delete file from private storage
  await supabase.storage
    .from(INGESTION_CONFIG.STORAGE_BUCKET)
    .remove([doc.storage_path]);

  // Delete database record (cascades to pages and jobs)
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    return { success: false, error: "Failed to delete document from database." };
  }

  revalidatePath("/dashboard/materials");

  return {
    success: true,
    message: "Document and extracted pages removed successfully.",
  };
}

/**
 * Generates a time-limited signed URL for viewing the private document.
 */
export async function getDocumentPreviewUrlAction(
  documentId: string
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Verify ownership
  const doc = await verifyDocumentAccess(supabase, documentId, user.id);

  const { data, error } = await supabase.storage
    .from(INGESTION_CONFIG.STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, 3600); // 1-hour signed URL

  if (error || !data?.signedUrl) {
    return { success: false, error: "Failed to generate document preview link." };
  }

  return { success: true, signedUrl: data.signedUrl };
}

