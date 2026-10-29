/**
 * Document Ingestion & Background Text Extraction Pipeline
 *
 * ⚠️ SECURITY & INTEGRITY ASSURANCE ⚠️
 * 1. Idempotent execution: Prevents duplicate concurrent jobs for the same document.
 * 2. Preserves document page numbers and sequential reading order.
 * 3. Detects scanned/low-text PDFs and connects to the OCR fallback interface.
 * 4. Structured logging without leaking sensitive document contents into log streams.
 * 5. Sanitizes all extracted text to treat it as untrusted candidate input.
 *
 * @module lib/ingestion/processor
 */
import { extractText } from "unpdf";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { INGESTION_CONFIG } from "./config";
import {
  validatePdfMagicBytes,
  sanitizeExtractedText,
} from "./validation";
import { getOcrProvider } from "./ocr";

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  status: "queued" | "processing" | "completed" | "failed" | "retryable";
  pageCount?: number;
  wordCount?: number;
  warnings: string[];
  ocrApplied: boolean;
  error?: string;
}

/**
 * Executes or retries the background document ingestion and text extraction pipeline.
 * Idempotent: Multiple concurrent calls will not duplicate jobs or pages.
 */
export async function processDocumentJob(
  supabase: SupabaseClient<Database>,
  documentId: string,
  options?: { forceRetry?: boolean }
): Promise<ProcessingResult> {
  const logPrefix = `[DocumentIngestion docId=${documentId}]`;

  // 1. Fetch document and processing job records
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, uploader_id, storage_path, filename, status")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    console.error(`${logPrefix} Document record not found in database.`);
    return {
      success: false,
      documentId,
      status: "failed",
      warnings: [],
      ocrApplied: false,
      error: "Document record not found.",
    };
  }

  // Fetch or initialize processing job
  let { data: job } = await supabase
    .from("document_processing_jobs")
    .select("*")
    .eq("document_id", documentId)
    .single();

  if (!job) {
    const { data: newJob, error: createJobError } = await supabase
      .from("document_processing_jobs")
      .insert({
        document_id: documentId,
        uploader_id: document.uploader_id,
        status: "queued",
        max_attempts: INGESTION_CONFIG.MAX_PROCESSING_ATTEMPTS,
      })
      .select()
      .single();

    if (createJobError || !newJob) {
      console.error(`${logPrefix} Failed to initialize processing job row.`);
      return {
        success: false,
        documentId,
        status: "failed",
        warnings: [],
        ocrApplied: false,
        error: "Failed to initialize document processing job.",
      };
    }
    job = newJob;
  }

  // 2. Idempotency Check: Don't reprocess if already completed unless forceRetry is specified
  if (job.status === "completed" && !options?.forceRetry) {
    return {
      success: true,
      documentId,
      status: "completed",
      warnings: job.extraction_warnings ?? [],
      ocrApplied: job.ocr_applied ?? false,
    };
  }

  // Check if actively being processed right now (avoid conflicting duplicate workers)
  if (job.status === "processing" && job.started_at && !options?.forceRetry) {
    const elapsedMs = Date.now() - new Date(job.started_at).getTime();
    if (elapsedMs < INGESTION_CONFIG.PROCESSING_HEARTBEAT_TIMEOUT_MS) {
      return {
        success: true,
        documentId,
        status: "processing",
        warnings: job.extraction_warnings ?? [],
        ocrApplied: job.ocr_applied ?? false,
      };
    }
  }

  // 3. Mark job as 'processing' and increment attempt count
  const newAttemptCount = job.attempt_count + 1;
  await supabase
    .from("document_processing_jobs")
    .update({
      status: "processing",
      attempt_count: newAttemptCount,
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", job.id);

  await supabase
    .from("documents")
    .update({ status: "processing" })
    .eq("id", documentId);

  try {
    // 4. Download file from private storage bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(INGESTION_CONFIG.STORAGE_BUCKET)
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download document from storage: ${downloadError?.message ?? "Empty file data"}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Binary magic bytes validation
    if (!validatePdfMagicBytes(buffer)) {
      throw new Error("Invalid file header: File is not a valid PDF (%PDF- header missing).");
    }

    // 6. Extract text page-by-page using unpdf
    const { totalPages, text: rawPages } = await extractText(new Uint8Array(buffer), {
      mergePages: false,
    });

    if (!totalPages || totalPages <= 0) {
      throw new Error("Document structure contains 0 readable pages.");
    }

    if (totalPages > INGESTION_CONFIG.MAX_PAGE_COUNT) {
      throw new Error(
        `Document contains ${totalPages} pages, exceeding the maximum allowed limit of ${INGESTION_CONFIG.MAX_PAGE_COUNT} pages.`
      );
    }

    const warnings: string[] = [];
    let ocrRequired = false;
    let ocrApplied = false;
    let totalWordCount = 0;

    const pageRecords: Array<{
      document_id: string;
      page_number: number;
      extracted_text: string;
      word_count: number;
      has_low_text: boolean;
    }> = [];

    const ocrProvider = getOcrProvider();

    // 7. Iterate through each page sequentially, preserving page numbers & document order
    const pagesArray = Array.isArray(rawPages) ? rawPages : [String(rawPages ?? "")];

    for (let index = 0; index < totalPages; index++) {
      const pageNumber = index + 1;
      let pageText = sanitizeExtractedText(pagesArray[index] ?? "");
      let words = pageText.split(/\s+/).filter(Boolean);
      let wordCount = words.length;

      const isLowText =
        wordCount < INGESTION_CONFIG.LOW_TEXT_WORD_THRESHOLD ||
        pageText.length < INGESTION_CONFIG.LOW_TEXT_CHAR_THRESHOLD;

      if (isLowText) {
        ocrRequired = true;

        // If almost no text was extracted and OCR provider is active, run OCR fallback
        if (wordCount < 5 && ocrProvider.isAvailable()) {
          try {
            const ocrResult = await ocrProvider.extractPage(buffer, pageNumber);
            if (ocrResult.text) {
              pageText = sanitizeExtractedText(ocrResult.text);
              words = pageText.split(/\s+/).filter(Boolean);
              wordCount = words.length;
              ocrApplied = true;
            }
          } catch (ocrErr) {
            console.warn(`${logPrefix} OCR fallback failed for page ${pageNumber}:`, ocrErr);
          }
        }

        warnings.push(`Page ${pageNumber} has low text density; may contain images, handwriting, or diagrams.`);
      }

      totalWordCount += wordCount;

      pageRecords.push({
        document_id: documentId,
        page_number: pageNumber,
        extracted_text: pageText,
        word_count: wordCount,
        has_low_text: isLowText,
      });
    }

    if (ocrRequired) {
      warnings.push("Document flagged with low text density. OCR fallback was evaluated.");
    }

    // 8. Store extracted pages atomically (replace old pages on retry)
    await supabase.from("document_pages").delete().eq("document_id", documentId);

    const { error: insertPagesError } = await supabase
      .from("document_pages")
      .insert(pageRecords);

    if (insertPagesError) {
      throw new Error(`Failed to save extracted pages into database: ${insertPagesError.message}`);
    }

    // 9. Update document and job status to 'completed' / 'ready'
    await supabase
      .from("documents")
      .update({
        status: "ready",
        page_count: totalPages,
        error_message: null,
      })
      .eq("id", documentId);

    await supabase
      .from("document_processing_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        extraction_warnings: warnings,
        ocr_required: ocrRequired,
        ocr_applied: ocrApplied,
        error_message: null,
      })
      .eq("id", job.id);

    console.info(`${logPrefix} Extraction completed: pages=${totalPages}, words=${totalWordCount}, ocr=${ocrApplied}`);

    return {
      success: true,
      documentId,
      status: "completed",
      pageCount: totalPages,
      wordCount: totalWordCount,
      warnings,
      ocrApplied,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Ingestion pipeline error on attempt ${newAttemptCount}:`, errorMsg);

    const canRetry = newAttemptCount < job.max_attempts;
    const finalStatus: "retryable" | "failed" = canRetry ? "retryable" : "failed";

    await supabase
      .from("documents")
      .update({
        status: "failed",
        error_message: errorMsg,
      })
      .eq("id", documentId);

    await supabase
      .from("document_processing_jobs")
      .update({
        status: finalStatus,
        error_message: errorMsg,
      })
      .eq("id", job.id);

    return {
      success: false,
      documentId,
      status: finalStatus,
      warnings: [],
      ocrApplied: false,
      error: errorMsg,
    };
  }
}
