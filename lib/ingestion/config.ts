/**
 * Document Ingestion Configuration & Processing Limits
 *
 * Configurable thresholds for PDF validation, extraction, and rate limiting.
 *
 * @module lib/ingestion/config
 */

export const INGESTION_CONFIG = {
  /** Maximum upload file size in bytes (20 MB default) */
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,

  /** Maximum allowed page count per document (100 pages default) */
  MAX_PAGE_COUNT: 100,

  /** Minimum word count per page to consider it normal text vs scanned image */
  LOW_TEXT_WORD_THRESHOLD: 15,

  /** Minimum character count per page threshold */
  LOW_TEXT_CHAR_THRESHOLD: 80,

  /** Maximum processing retry attempts before permanent failure */
  MAX_PROCESSING_ATTEMPTS: 3,

  /** Maximum uploads permitted per student per hour */
  MAX_UPLOADS_PER_USER_PER_HOUR: 10,

  /** Processing timeout in milliseconds before a job is considered stalled (5 minutes) */
  PROCESSING_HEARTBEAT_TIMEOUT_MS: 5 * 60 * 1000,

  /** Storage bucket name for study materials */
  STORAGE_BUCKET: "materials",

  /** Allowed MIME types */
  ALLOWED_MIME_TYPES: ["application/pdf"] as const,
} as const;

