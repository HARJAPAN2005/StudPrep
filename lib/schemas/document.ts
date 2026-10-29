/**
 * Zod schemas for document upload.
 *
 * @module lib/schemas/document
 */
import { z } from "zod";

/** Allowed MIME types for document upload */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/** Maximum file size in bytes (20 MB) */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** Schema for document upload form */
export const UploadDocumentSchema = z.object({
  subject_id: z.string().uuid("Invalid subject ID"),
  filename: z.string().min(1, "Filename is required"),
  file_size: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "File must not exceed 20 MB"),
  mime_type: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: "Only PDF and DOCX files are allowed" }),
  }),
});

export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;

/** Valid document processing statuses */
export const DocumentStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "failed",
]);

export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

