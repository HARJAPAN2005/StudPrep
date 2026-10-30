"use server";

/**
 * Administrative Console & Audit Trail Actions
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * 1. Role-Based Access Control: All actions strictly require administrator privileges.
 * 2. Immutable Consequential Action Logging: Every administrative intervention (job retries,
 *    question dispute resolutions, data modifications) writes to admin_audit_logs.
 * 3. Least Privilege: Administrative APIs return operational metrics and anonymized indicators
 *    without exposing raw student credentials.
 *
 * @module app/actions/admin
 */

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  AdminUpdateQuestionReportInputSchema,
  type AdminUpdateQuestionReportInput,
  type AdminDashboardOverview,
  type OperationalJobSummary,
  type ReportedQuestionItem,
  type AIUsageMetricsSummary,
  type AdminAuditLogEntry,
  type RecordAuditLogInput,
} from "@/lib/schemas/admin";
import type { Json } from "@/types/supabase";

/**
 * Retrieves the comprehensive administrative dashboard overview:
 * operational job health, reported questions, AI usage metrics, and audit logs.
 */
export async function getAdminDashboardOverviewAction(): Promise<{
  success: boolean;
  data?: AdminDashboardOverview;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase);

    // 1. Fetch document processing jobs with document titles
    const { data: jobsData, error: jobsError } = await supabase
      .from("document_processing_jobs")
      .select("id, document_id, status, attempt_count, max_attempts, error_message, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (jobsError) {
      console.warn("[admin] Error loading processing jobs:", jobsError.message);
    }

    // Fetch document titles for these jobs
    const docIds = [...new Set((jobsData ?? []).map((j) => j.document_id))];
    const docTitleMap = new Map<string, string>();
    if (docIds.length > 0) {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, filename")
        .in("id", docIds);
      for (const d of docs ?? []) {
        docTitleMap.set(d.id, d.filename);
      }
    }

    const operationalJobs: OperationalJobSummary[] = (jobsData ?? []).map((j) => ({
      id: j.id,
      documentId: j.document_id,
      documentTitle: docTitleMap.get(j.document_id) ?? "Study Material Document",
      status: j.status,
      attemptCount: j.attempt_count,
      maxAttempts: j.max_attempts,
      errorMessage: j.error_message,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
    }));

    // 2. Fetch reported question issues
    const { data: reportsData, error: reportsError } = await supabase
      .from("reported_questions")
      .select("id, attempt_id, student_id, question_id, issue_type, comment, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (reportsError) {
      console.warn("[admin] Error loading reported questions:", reportsError.message);
    }

    const reportedQuestions: ReportedQuestionItem[] = (reportsData ?? []).map((r) => ({
      id: r.id,
      attemptId: r.attempt_id,
      studentId: r.student_id,
      studentName: null, // Privacy-conscious: omit full PII unless drilled into
      questionId: r.question_id,
      issueType: r.issue_type,
      comment: r.comment,
      status: r.status,
      createdAt: r.created_at,
    }));

    // 3. Compute AI usage metrics from question_tutor_cache
    const { data: aiUsageData } = await supabase
      .from("question_tutor_cache")
      .select("input_tokens, output_tokens, latency_ms");

    const totalCalls = aiUsageData?.length ?? 0;
    const totalInput = (aiUsageData ?? []).reduce((acc, row) => acc + (row.input_tokens || 0), 0);
    const totalOutput = (aiUsageData ?? []).reduce((acc, row) => acc + (row.output_tokens || 0), 0);
    const totalTokens = totalInput + totalOutput;
    const totalLatency = (aiUsageData ?? []).reduce((acc, row) => acc + (row.latency_ms || 0), 0);
    const avgLatencyMs = totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0;
    // Estimated cost: Gemini 2.5 Flash (~$0.075 per 1M input, ~$0.30 per 1M output)
    const estimatedCostUsd =
      Math.round(((totalInput * 0.000000075) + (totalOutput * 0.0000003)) * 1000) / 1000;

    const aiUsage: AIUsageMetricsSummary = {
      totalCalls,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens,
      estimatedCostUsd,
      avgLatencyMs,
      activeModel: "gemini-2.5-flash",
    };

    // 4. Fetch recent audit logs
    const { data: auditData } = await supabase
      .from("admin_audit_logs")
      .select("id, admin_id, action, target_type, target_id, details, ip_address, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    const recentAuditLogs: AdminAuditLogEntry[] = (auditData ?? []).map((a) => ({
      id: a.id,
      adminId: a.admin_id,
      action: a.action as AdminAuditLogEntry["action"],
      targetType: a.target_type,
      targetId: a.target_id,
      details: (a.details ?? {}) as Record<string, unknown>,
      ipAddress: a.ip_address,
      createdAt: a.created_at,
    }));

    const failedCount = operationalJobs.filter((j) => j.status === "failed").length;
    const openReportsCount = reportedQuestions.filter((r) => r.status === "open").length;

    return {
      success: true,
      data: {
        operationalJobs,
        reportedQuestions,
        aiUsage,
        recentAuditLogs,
        stats: {
          totalJobs: operationalJobs.length,
          failedJobs: failedCount,
          openReports: openReportsCount,
          totalAuditLogs: recentAuditLogs.length,
        },
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Access denied or database error";
    console.error("[admin] getAdminDashboardOverviewAction error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Re-queues a failed or retryable document processing job.
 * Consequential action: writes to admin_audit_logs.
 */
export async function adminRetryProcessingJobAction(
  jobId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const admin = await requireAdmin(supabase);

    const { data: job, error: jobError } = await supabase
      .from("document_processing_jobs")
      .select("id, document_id, status")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return { success: false, error: "Processing job not found." };
    }

    const { error: updateError } = await supabase
      .from("document_processing_jobs")
      .update({
        status: "retryable",
        attempt_count: 0,
        error_message: null,
      })
      .eq("id", jobId);

    if (updateError) {
      return { success: false, error: "Failed to reset job state." };
    }

    // Write audit log
    await recordAdminAuditLog(supabase, {
      adminId: admin.id,
      action: "retry_processing_job",
      targetType: "document_processing_job",
      targetId: jobId,
      details: { previousStatus: job.status, documentId: job.document_id },
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: msg };
  }
}

/**
 * Updates the resolution status of a student-reported question dispute.
 * Consequential action: writes to admin_audit_logs.
 */
export async function adminUpdateQuestionReportAction(
  input: AdminUpdateQuestionReportInput
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const parsed = AdminUpdateQuestionReportInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" };
    }

    const { reportId, status, resolutionNotes } = parsed.data;

    const supabase = await createClient();
    const admin = await requireAdmin(supabase);

    const { data: existingReport, error: fetchError } = await supabase
      .from("reported_questions")
      .select("id, question_id, status")
      .eq("id", reportId)
      .single();

    if (fetchError || !existingReport) {
      return { success: false, error: "Reported question not found." };
    }

    const { error: updateError } = await supabase
      .from("reported_questions")
      .update({
        status,
        comment: resolutionNotes
          ? `${existingReport.status !== status ? `[Status -> ${status}] ` : ""}${resolutionNotes}`
          : undefined,
      })
      .eq("id", reportId);

    if (updateError) {
      return { success: false, error: "Failed to update report status." };
    }

    // Write audit log
    await recordAdminAuditLog(supabase, {
      adminId: admin.id,
      action: "update_question_report",
      targetType: "reported_question",
      targetId: reportId,
      details: {
        questionId: existingReport.question_id,
        previousStatus: existingReport.status,
        newStatus: status,
        notes: resolutionNotes ?? null,
      },
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: msg };
  }
}

/**
 * Helper to record consequential administrative actions in admin_audit_logs.
 */
export async function recordAdminAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    adminId: string;
    action: RecordAuditLogInput["action"];
    targetType: string;
    targetId: string;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
  }
): Promise<void> {
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: params.adminId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: (params.details ?? {}) as Json,
      ip_address: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[admin-audit] Failed to write audit log:", err);
  }
}
