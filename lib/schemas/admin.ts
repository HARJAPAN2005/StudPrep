/**
 * Admin Console & Audit Logging Schemas
 *
 * Strict contracts for operational job health, AI usage reporting,
 * reported question management, and immutable consequential action audit trails.
 *
 * @module lib/schemas/admin
 */
import { z } from "zod";

export const AdminAuditActionTypeSchema = z.enum([
  "retry_processing_job",
  "cancel_processing_job",
  "update_question_report",
  "delete_study_material",
  "delete_user_account",
  "update_subject",
  "purge_expired_attempts",
  "export_student_data",
]);
export type AdminAuditActionType = z.infer<typeof AdminAuditActionTypeSchema>;

export const RecordAuditLogInputSchema = z.object({
  action: AdminAuditActionTypeSchema,
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  details: z.record(z.string(), z.unknown()).default({}),
  ipAddress: z.string().nullable().optional(),
});
export type RecordAuditLogInput = z.infer<typeof RecordAuditLogInputSchema>;

export const AdminAuditLogEntrySchema = z.object({
  id: z.string(),
  adminId: z.string().nullable(),
  adminName: z.string().optional(),
  action: AdminAuditActionTypeSchema,
  targetType: z.string(),
  targetId: z.string(),
  details: z.record(z.string(), z.unknown()),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminAuditLogEntry = z.infer<typeof AdminAuditLogEntrySchema>;

export const AdminUpdateQuestionReportInputSchema = z.object({
  reportId: z.string().uuid("Invalid report ID"),
  status: z.enum(["open", "reviewed", "resolved", "dismissed"]),
  resolutionNotes: z.string().max(1000).optional(),
});
export type AdminUpdateQuestionReportInput = z.infer<typeof AdminUpdateQuestionReportInputSchema>;

export const OperationalJobSummarySchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  status: z.enum(["queued", "processing", "completed", "failed", "retryable"]),
  attemptCount: z.number().int(),
  maxAttempts: z.number().int(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OperationalJobSummary = z.infer<typeof OperationalJobSummarySchema>;

export const ReportedQuestionItemSchema = z.object({
  id: z.string(),
  attemptId: z.string(),
  studentId: z.string(),
  studentName: z.string().nullable(),
  questionId: z.string(),
  issueType: z.enum([
    "incorrect_answer_key",
    "ambiguous_question",
    "typo_formatting",
    "outdated_syllabus",
    "other",
  ]),
  comment: z.string().nullable(),
  status: z.enum(["open", "reviewed", "resolved", "dismissed"]),
  createdAt: z.string(),
});
export type ReportedQuestionItem = z.infer<typeof ReportedQuestionItemSchema>;

export const AIUsageMetricsSummarySchema = z.object({
  totalCalls: z.number().int(),
  totalInputTokens: z.number().int(),
  totalOutputTokens: z.number().int(),
  totalTokens: z.number().int(),
  estimatedCostUsd: z.number(),
  avgLatencyMs: z.number(),
  activeModel: z.string(),
});
export type AIUsageMetricsSummary = z.infer<typeof AIUsageMetricsSummarySchema>;

export const AdminDashboardOverviewSchema = z.object({
  operationalJobs: z.array(OperationalJobSummarySchema),
  reportedQuestions: z.array(ReportedQuestionItemSchema),
  aiUsage: AIUsageMetricsSummarySchema,
  recentAuditLogs: z.array(AdminAuditLogEntrySchema),
  stats: z.object({
    totalJobs: z.number().int(),
    failedJobs: z.number().int(),
    openReports: z.number().int(),
    totalAuditLogs: z.number().int(),
  }),
});
export type AdminDashboardOverview = z.infer<typeof AdminDashboardOverviewSchema>;

