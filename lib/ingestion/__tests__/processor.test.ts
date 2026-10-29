import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDocumentJob } from "../processor";
import { extractText } from "unpdf";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

vi.mock("unpdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("unpdf")>();
  return {
    ...actual,
    extractText: vi.fn(),
  };
});

describe("Document Ingestion Processor Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const samplePdfBytes = new TextEncoder().encode("%PDF-1.7\nSample syllabus document contents.");

  it("extracts text preserving page numbers and document order", async () => {
    vi.mocked(extractText).mockResolvedValue({
      totalPages: 3,
      text: [
        "Page 1: Fundamental Newtonian Mechanics and Kinematics",
        "Page 2: Thermodynamics and Heat Transfer Formulas",
        "Page 3: Quantum Physics and Wave Mechanics Summary",
      ],
    });

    const mockPagesInsert = vi.fn().mockResolvedValue({ error: null });
    const mockPagesDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "documents") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "doc-1",
                    uploader_id: "user-1",
                    storage_path: "user-1/doc-1.pdf",
                    filename: "physics.pdf",
                    status: "pending",
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "document_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "job-1",
                    document_id: "doc-1",
                    uploader_id: "user-1",
                    status: "queued",
                    attempt_count: 0,
                    max_attempts: 3,
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "document_pages") {
          return {
            delete: mockPagesDelete,
            insert: mockPagesInsert,
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({
            data: {
              arrayBuffer: vi.fn().mockResolvedValue(samplePdfBytes.buffer),
            },
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const result = await processDocumentJob(mockSupabase, "doc-1");

    expect(result.success).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.pageCount).toBe(3);
    expect(mockPagesInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ page_number: 1 }),
        expect.objectContaining({ page_number: 2 }),
        expect.objectContaining({ page_number: 3 }),
      ])
    );
  });

  it("enforces idempotency: does not reprocess when job is already completed", async () => {
    const mockDownload = vi.fn();

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "documents") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "doc-done",
                    uploader_id: "user-1",
                    storage_path: "user-1/doc-done.pdf",
                    filename: "done.pdf",
                    status: "ready",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "document_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "job-done",
                    document_id: "doc-done",
                    status: "completed",
                    extraction_warnings: [],
                    ocr_applied: false,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({ download: mockDownload }),
      },
    } as unknown as SupabaseClient<Database>;

    const result = await processDocumentJob(mockSupabase, "doc-done");

    expect(result.success).toBe(true);
    expect(result.status).toBe("completed");
    expect(mockDownload).not.toHaveBeenCalled(); // Download skipped due to idempotency
  });

  it("handles concurrent job prevention: ignores worker if already processing", async () => {
    const mockDownload = vi.fn();

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "documents") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "doc-busy",
                    uploader_id: "user-1",
                    storage_path: "user-1/doc-busy.pdf",
                    filename: "busy.pdf",
                    status: "processing",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "document_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "job-busy",
                    document_id: "doc-busy",
                    status: "processing",
                    started_at: new Date().toISOString(), // recent heartbeat
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({ download: mockDownload }),
      },
    } as unknown as SupabaseClient<Database>;

    const result = await processDocumentJob(mockSupabase, "doc-busy");

    expect(result.status).toBe("processing");
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("detects low-text density and triggers OCR fallback", async () => {
    vi.mocked(extractText).mockResolvedValue({
      totalPages: 1,
      text: [""], // Empty text indicating scanned diagram
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "documents") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "doc-scanned",
                    uploader_id: "user-1",
                    storage_path: "user-1/scanned.pdf",
                    filename: "scanned.pdf",
                    status: "pending",
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "document_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "job-scan",
                    document_id: "doc-scanned",
                    uploader_id: "user-1",
                    status: "queued",
                    attempt_count: 0,
                    max_attempts: 3,
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "document_pages") {
          return {
            delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({
            data: { arrayBuffer: vi.fn().mockResolvedValue(samplePdfBytes.buffer) },
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const result = await processDocumentJob(mockSupabase, "doc-scanned");

    expect(result.success).toBe(true);
    expect(result.ocrApplied).toBe(true);
    expect(result.warnings.some((w) => w.includes("low text density"))).toBe(true);
  });

  it("transitions to retryable when attempt count is less than max_attempts", async () => {
    const mockJobUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "documents") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "doc-fail-1",
                    uploader_id: "user-1",
                    storage_path: "user-1/fail.pdf",
                    filename: "fail.pdf",
                    status: "pending",
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
          };
        }
        if (table === "document_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "job-fail-1",
                    document_id: "doc-fail-1",
                    uploader_id: "user-1",
                    status: "queued",
                    attempt_count: 0, // Will become 1 (less than 3)
                    max_attempts: 3,
                  },
                  error: null,
                }),
              }),
            }),
            update: mockJobUpdate,
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Storage timeout connection error" },
          }),
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const result = await processDocumentJob(mockSupabase, "doc-fail-1");

    expect(result.success).toBe(false);
    expect(result.status).toBe("retryable");
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "retryable" })
    );
  });

  it("transitions to failed when attempt count reaches max_attempts", async () => {
    const mockJobUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "documents") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "doc-fail-max",
                    uploader_id: "user-1",
                    storage_path: "user-1/fail-max.pdf",
                    filename: "fail.pdf",
                    status: "pending",
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
          };
        }
        if (table === "document_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "job-fail-max",
                    document_id: "doc-fail-max",
                    uploader_id: "user-1",
                    status: "queued",
                    attempt_count: 2, // Will become 3 (equals max_attempts)
                    max_attempts: 3,
                  },
                  error: null,
                }),
              }),
            }),
            update: mockJobUpdate,
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Permanent corrupt file failure" },
          }),
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const result = await processDocumentJob(mockSupabase, "doc-fail-max");

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });
});
