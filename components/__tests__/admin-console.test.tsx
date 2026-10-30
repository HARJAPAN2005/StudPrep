import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminConsoleClient } from "@/app/(admin)/admin/admin-console-client";
import type { AdminDashboardOverview } from "@/lib/schemas/admin";
import * as adminActions from "@/app/actions/admin";

const MOCK_ADMIN_DATA: AdminDashboardOverview = {
  operationalJobs: [
    {
      id: "job-101",
      documentId: "doc-1",
      documentTitle: "WAEC Further Mathematics 2025.pdf",
      status: "failed",
      attemptCount: 3,
      maxAttempts: 3,
      errorMessage: "OCR text extraction timeout",
      createdAt: "2026-10-30T09:00:00Z",
      updatedAt: "2026-10-30T09:05:00Z",
    },
  ],
  reportedQuestions: [
    {
      id: "rep-202",
      attemptId: "att-1",
      studentId: "stu-1",
      studentName: null,
      questionId: "q-algebra-01",
      issueType: "incorrect_answer_key",
      comment: "The quadratic formula signs are inverted in option C",
      status: "open",
      createdAt: "2026-10-30T10:00:00Z",
    },
  ],
  aiUsage: {
    totalCalls: 45,
    totalInputTokens: 125000,
    totalOutputTokens: 65000,
    totalTokens: 190000,
    estimatedCostUsd: 0.029,
    avgLatencyMs: 380,
    activeModel: "gemini-2.5-flash",
  },
  recentAuditLogs: [
    {
      id: "audit-1",
      adminId: "admin-uuid-1",
      action: "retry_processing_job",
      targetType: "document_processing_job",
      targetId: "job-99",
      details: {},
      ipAddress: "127.0.0.1",
      createdAt: "2026-10-30T08:00:00Z",
    },
  ],
  stats: {
    totalJobs: 1,
    failedJobs: 1,
    openReports: 1,
    totalAuditLogs: 1,
  },
};

describe("AdminConsoleClient Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders stat cards and initial processing jobs tab", () => {
    render(<AdminConsoleClient initialData={MOCK_ADMIN_DATA} />);

    expect(screen.getByText("WAEC Further Mathematics 2025.pdf")).toBeDefined();
    expect(screen.getByText("1 Failed")).toBeDefined();
    expect(screen.getByText("Candidate disputes")).toBeDefined();
    expect(screen.getByText("$0.029")).toBeDefined();
    expect(screen.getByRole("button", { name: /Retry/i })).toBeDefined();
  });

  it("triggers job retry action on retry button click", async () => {
    const retrySpy = vi
      .spyOn(adminActions, "adminRetryProcessingJobAction")
      .mockResolvedValue({ success: true });

    render(<AdminConsoleClient initialData={MOCK_ADMIN_DATA} />);

    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(retrySpy).toHaveBeenCalledWith("job-101");
      expect(screen.getByText(/reset to retryable/i)).toBeDefined();
    });
  });

  it("switches to Reported Questions tab and handles resolve action", async () => {
    const updateReportSpy = vi
      .spyOn(adminActions, "adminUpdateQuestionReportAction")
      .mockResolvedValue({ success: true });

    render(<AdminConsoleClient initialData={MOCK_ADMIN_DATA} />);

    // Click Reported Questions tab
    const reportsTab = screen.getByRole("tab", { name: /Reported Questions/i });
    fireEvent.click(reportsTab);

    expect(screen.getByText("The quadratic formula signs are inverted in option C")).toBeDefined();

    // Click Resolve
    const resolveBtn = screen.getByRole("button", { name: /Resolve/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(updateReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ reportId: "rep-202", status: "resolved" })
      );
      expect(screen.getByText(/marked as resolved/i)).toBeDefined();
    });
  });

  it("switches to AI Metrics tab and displays token telemetry", () => {
    render(<AdminConsoleClient initialData={MOCK_ADMIN_DATA} />);

    const aiTab = screen.getByRole("tab", { name: /AI Metrics/i });
    fireEvent.click(aiTab);

    expect(screen.getByText("AI Inference Telemetry & Cost Model")).toBeDefined();
    expect(screen.getByText(/Input Tokens/i)).toBeDefined();
    expect(screen.getByText(/Output Tokens/i)).toBeDefined();
    expect(screen.getByText("380 ms")).toBeDefined();
  });

  it("switches to Audit Trail tab and displays consequential action log", () => {
    render(<AdminConsoleClient initialData={MOCK_ADMIN_DATA} />);

    const auditTab = screen.getByRole("tab", { name: /Audit Trail/i });
    fireEvent.click(auditTab);

    expect(screen.getByText("Administrative Audit Log")).toBeDefined();
    expect(screen.getByText("retry_processing_job")).toBeDefined();
    expect(screen.getByText("document_processing_job")).toBeDefined();
  });
});
