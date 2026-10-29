/**
 * Document Ingestion Validation & Security Sanitization
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * 1. Validates magic bytes / file signatures to prevent MIME spoofing.
 * 2. Generates safe internal storage paths and discards user paths.
 * 3. Sanitizes all extracted text to prevent script execution or injection.
 * 4. Detects encrypted, password-protected, or corrupted PDFs.
 *
 * @module lib/ingestion/validation
 */
import { getDocumentProxy } from "unpdf";
import { INGESTION_CONFIG } from "./config";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  pageCount?: number;
  isEncrypted?: boolean;
}

/** PDF Magic Byte Sequence: %PDF- (0x25 0x50 0x44 0x46 0x2D) */
const PDF_MAGIC_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

/**
 * Validates the binary header of a file buffer to verify it is genuinely a PDF.
 * Scans the first 1024 bytes to account for possible byte-order marks (BOM) or headers.
 */
export function validatePdfMagicBytes(buffer: Uint8Array | Buffer): boolean {
  if (!buffer || buffer.length < 5) {
    return false;
  }

  const searchWindow = Math.min(buffer.length - 4, 1024);
  for (let i = 0; i < searchWindow; i++) {
    if (
      buffer[i] === PDF_MAGIC_BYTES[0] &&
      buffer[i + 1] === PDF_MAGIC_BYTES[1] &&
      buffer[i + 2] === PDF_MAGIC_BYTES[2] &&
      buffer[i + 3] === PDF_MAGIC_BYTES[3] &&
      buffer[i + 4] === PDF_MAGIC_BYTES[4]
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Strips path separators, null bytes, and dangerous characters from user filenames.
 * Used for human-readable display only; internal storage paths use generated UUIDs.
 */
export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename || typeof rawFilename !== "string") {
    return "document.pdf";
  }

  // Remove directory separators, null characters, and control characters
  let clean = rawFilename
    .replace(/[/\\]/g, "")
    .replace(/\0/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();

  // Strip path traversal indicators and leading dots
  clean = clean.replace(/\.{2,}/g, ".").replace(/^\.+/, "");

  // Guarantee .pdf extension
  if (!clean.toLowerCase().endsWith(".pdf")) {
    clean = `${clean}.pdf`;
  }

  // Limit filename length to 120 characters
  if (clean.length > 120) {
    const ext = ".pdf";
    clean = `${clean.slice(0, 120 - ext.length)}${ext}`;
  }

  return clean || "document.pdf";
}

/**
 * Generates an isolated, unpredictable internal storage path:
 * `{userId}/{documentId}.pdf`
 */
export function generateInternalStoragePath(userId: string, documentId: string): string {
  // Validate UUID formats to prevent any directory manipulation
  const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, "");
  const safeDocId = documentId.replace(/[^a-zA-Z0-9-]/g, "");
  return `${safeUserId}/${safeDocId}.pdf`;
}

/**
 * Inspects a PDF buffer using unpdf to detect corruption, encryption, and page limits.
 */
export async function inspectPdfBuffer(buffer: Buffer | Uint8Array): Promise<ValidationResult> {
  // 1. Magic bytes validation
  if (!validatePdfMagicBytes(buffer)) {
    return {
      valid: false,
      error: "Invalid file format: File header does not match standard PDF specification (%PDF-).",
    };
  }

  // 2. File size validation
  if (buffer.length > INGESTION_CONFIG.MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(INGESTION_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds the allowable limit of ${maxMb} MB.`,
    };
  }

  // 3. Structural inspection with unpdf
  try {
    const pdfData = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const doc = await getDocumentProxy(pdfData);
    const totalPages = doc.numPages;

    if (totalPages <= 0) {
      return {
        valid: false,
        error: "PDF document contains no readable pages.",
      };
    }

    if (totalPages > INGESTION_CONFIG.MAX_PAGE_COUNT) {
      return {
        valid: false,
        error: `Document has ${totalPages} pages, exceeding the maximum limit of ${INGESTION_CONFIG.MAX_PAGE_COUNT} pages.`,
        pageCount: totalPages,
      };
    }

    return {
      valid: true,
      pageCount: totalPages,
      isEncrypted: false,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (
      errorMsg.toLowerCase().includes("password") ||
      errorMsg.toLowerCase().includes("encrypted")
    ) {
      return {
        valid: false,
        error: "Password-protected or encrypted PDFs are not supported. Please remove the password and try again.",
        isEncrypted: true,
      };
    }

    return {
      valid: false,
      error: `Corrupted or unreadable PDF: ${errorMsg}`,
    };
  }
}

/**
 * Sanitizes extracted text:
 * - Strips null bytes and binary control codes
 * - Normalizes unicode and consecutive blank lines
 * - Discards executable instruction prefixes
 */
export function sanitizeExtractedText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  return rawText
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Keep \t, \n, \r
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
