import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAdminDashboardOverviewAction,
  adminRetryProcessingJobAction,
  adminUpdateQuestionReportAction,
} from "../admin";
import * as serverModule from "@/lib/supabase/server";
import * as authModule from "@/lib/auth/authorization";

const ADMIN_ID = "00000000-0000-0000-0000-000000000099";
const STUDENT_ID = "00000000-0000-0000-0000-000000000001";
const REPORT_UUID = "33333333-3333-3333-3333-333333333333";

describe("Admin Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default safe mock for createClient
    // @ts-expect-error partial mock
    vi.spyOn(serverModule, "createClient").mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  describe("getAdminDashboardOverviewAction", () => {
    it("rejects non-admin student with forbidden error", async () => {
      vi.spyOn(authModule, "requireAdmin").mockRejectedValue(
        new authModule.ForbiddenError("Administrative privileges required.")
      );

      const res = await getAdminDashboardOverviewAction();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/administrative privileges required/i);
    });

    it("returns overview metrics for authenticated admin", async () => {
      vi.spyOn(authModule, "requireAdmin").mockResolvedValue({
        id: ADMIN_ID,
        role: "admin",
        full_name: "Staff Admin",
        avatar_url: null,
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "document_processing_jobs") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "job-1",
                        document_id: "doc-1",
                        status: "failed",
                        attempt_count: 3,
                        max_attempts: 3,
                        error_message: "OCR timeout",
                        created_at: "2026-10-30T10:00:00Z",
                        updated_at: "2026-10-30T10:05:00Z",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "documents") {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [{ id: "doc-1", filename: "Physics_Syllabus.pdf" }],
                  error: null,
                }),
              }),
            };
          }
          if (table === "reported_questions") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "rep-1",
                        attempt_id: "att-1",
                        student_id: STUDENT_ID,
                        question_id: "q-1",
                        issue_type: "wrong_answer_key",
                        comment: "Option B is mathematically equivalent to C",
                        status: "open",
                        created_at: "2026-10-30T11:00:00Z",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "question_tutor_cache") {
            return {
              select: vi.fn().mockResolvedValue({
                data: [
                  { input_tokens: 500, output_tokens: 300, latency_ms: 450 },
                  { input_tokens: 400, output_tokens: 250, latency_ms: 350 },
                ],
                error: null,
              }),
            };
          }
          if (table === "admin_audit_logs") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "log-1",
                        admin_id: ADMIN_ID,
                        action: "retry_processing_job",
                        target_type: "document_processing_job",
                        target_id: "job-0",
                        details: {},
                        ip_address: null,
                        created_at: "2026-10-30T09:00:00Z",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await getAdminDashboardOverviewAction();

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.stats.totalJobs).toBe(1);
      expect(res.data?.stats.failedJobs).toBe(1);
      expect(res.data?.stats.openReports).toBe(1);
      expect(res.data?.aiUsage.totalCalls).toBe(2);
      expect(res.data?.aiUsage.totalTokens).toBe(1450);
      expect(res.data?.operationalJobs[0].documentTitle).toBe("Physics_Syllabus.pdf");
    });
  });

  describe("adminRetryProcessingJobAction", () => {
    it("blocks non-admin from retrying jobs", async () => {
      vi.spyOn(authModule, "requireAdmin").mockRejectedValue(
        new authModule.ForbiddenError("Access denied")
      );

      const res = await adminRetryProcessingJobAction("job-1");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/access denied/i);
    });

    it("resets job status to retryable and creates audit record", async () => {
      vi.spyOn(authModule, "requireAdmin").mockResolvedValue({
        id: ADMIN_ID,
        role: "admin",
        full_name: "Admin User",
        avatar_url: null,
      });

      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const insertSpy = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "document_processing_jobs") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "job-1", document_id: "doc-1", status: "failed" },
                    error: null,
                  }),
                }),
              }),
              update: updateSpy,
            };
          }
          if (table === "admin_audit_logs") {
            return {
              insert: insertSpy,
            };
          }
          return {};
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await adminRetryProcessingJobAction("job-1");

      expect(res.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "retryable", attempt_count: 0 })
      );
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: ADMIN_ID,
          action: "retry_processing_job",
          target_id: "job-1",
        })
      );
    });
  });

  describe("adminUpdateQuestionReportAction", () => {
    it("updates question dispute status and logs to audit trail", async () => {
      vi.spyOn(authModule, "requireAdmin").mockResolvedValue({
        id: ADMIN_ID,
        role: "admin",
        full_name: "Admin User",
        avatar_url: null,
      });

      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const insertSpy = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "reported_questions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "rep-1", question_id: "q-1", status: "open" },
                    error: null,
                  }),
                }),
              }),
              update: updateSpy,
            };
          }
          if (table === "admin_audit_logs") {
            return {
              insert: insertSpy,
            };
          }
          return {};
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await adminUpdateQuestionReportAction({
        reportId: REPORT_UUID,
        status: "resolved",
        resolutionNotes: "Fixed option formula formatting.",
      });

      expect(res.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "resolved" })
      );
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update_question_report",
          target_id: REPORT_UUID,
        })
      );
    });
  });
});
