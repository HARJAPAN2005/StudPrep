"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  Coins,
  FileText,
  RotateCcw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AdminDashboardOverview } from "@/lib/schemas/admin";
import {
  adminRetryProcessingJobAction,
  adminUpdateQuestionReportAction,
} from "@/app/actions/admin";

interface AdminConsoleClientProps {
  initialData: AdminDashboardOverview;
}

export function AdminConsoleClient({ initialData }: AdminConsoleClientProps) {
  const [data, setData] = React.useState<AdminDashboardOverview>(initialData);
  const [activeTab, setActiveTab] = React.useState<"jobs" | "reports" | "ai" | "audit">("jobs");
  const [actionLoading, setActionLoading] = React.useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const handleRetryJob = async (jobId: string) => {
    setActionLoading((prev) => ({ ...prev, [jobId]: true }));
    setStatusMessage(null);
    try {
      const res = await adminRetryProcessingJobAction(jobId);
      if (res.success) {
        setStatusMessage(`Job ${jobId.slice(0, 8)} reset to retryable.`);
        // Update local state optimistically
        setData((prev) => ({
          ...prev,
          operationalJobs: prev.operationalJobs.map((j) =>
            j.id === jobId ? { ...j, status: "retryable", attemptCount: 0, errorMessage: null } : j
          ),
          stats: {
            ...prev.stats,
            failedJobs: Math.max(0, prev.stats.failedJobs - 1),
          },
        }));
      } else {
        setStatusMessage(`Failed to reset job: ${res.error}`);
      }
    } catch {
      setStatusMessage("Failed to connect to administrative service.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleUpdateReportStatus = async (
    reportId: string,
    status: "reviewed" | "resolved" | "dismissed"
  ) => {
    setActionLoading((prev) => ({ ...prev, [reportId]: true }));
    setStatusMessage(null);
    try {
      const res = await adminUpdateQuestionReportAction({
        reportId,
        status,
        resolutionNotes: `Status updated to ${status} via Admin Console.`,
      });
      if (res.success) {
        setStatusMessage(`Report ${reportId.slice(0, 8)} marked as ${status}.`);
        setData((prev) => ({
          ...prev,
          reportedQuestions: prev.reportedQuestions.map((r) =>
            r.id === reportId ? { ...r, status } : r
          ),
          stats: {
            ...prev.stats,
            openReports: Math.max(0, prev.stats.openReports - 1),
          },
        }));
      } else {
        setStatusMessage(`Failed to update report: ${res.error}`);
      }
    } catch {
      setStatusMessage("Failed to update report status.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Status Feedback Banner ────────────────────────────────────────── */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 text-sm rounded-lg border bg-card text-foreground flex items-center justify-between border-primary/20 shadow-sm"
        >
          <span>{statusMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusMessage(null)}
            className="text-xs h-7"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ── Top Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Ingestion Jobs</span>
              <p className="text-2xl font-bold text-foreground">{data.stats.totalJobs}</p>
              <p className="text-[11px] text-muted-foreground">
                {data.stats.failedJobs > 0 ? (
                  <span className="text-red-500 font-semibold">{data.stats.failedJobs} Failed</span>
                ) : (
                  <span className="text-emerald-500 font-semibold">All Healthy</span>
                )}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Open Question Reports</span>
              <p className="text-2xl font-bold text-foreground">{data.stats.openReports}</p>
              <p className="text-[11px] text-muted-foreground">Candidate disputes</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">AI Token Volume</span>
              <p className="text-2xl font-bold text-foreground font-mono">
                {data.aiUsage.totalTokens.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground">{data.aiUsage.totalCalls} Calls logged</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Brain className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Estimated AI Cost</span>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${data.aiUsage.estimatedCostUsd.toFixed(3)}
              </p>
              <p className="text-[11px] text-emerald-500 font-medium">Gemini 2.5 Flash</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Admin Navigation Tabs"
        className="flex space-x-2 border-b border-border pb-2"
      >
        <Button
          role="tab"
          aria-selected={activeTab === "jobs"}
          variant={activeTab === "jobs" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("jobs")}
          className="text-xs gap-1.5"
        >
          <Activity className="h-3.5 w-3.5" />
          Processing Jobs ({data.operationalJobs.length})
        </Button>
        <Button
          role="tab"
          aria-selected={activeTab === "reports"}
          variant={activeTab === "reports" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("reports")}
          className="text-xs gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Reported Questions ({data.reportedQuestions.length})
        </Button>
        <Button
          role="tab"
          aria-selected={activeTab === "ai"}
          variant={activeTab === "ai" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("ai")}
          className="text-xs gap-1.5"
        >
          <Brain className="h-3.5 w-3.5" />
          AI Metrics
        </Button>
        <Button
          role="tab"
          aria-selected={activeTab === "audit"}
          variant={activeTab === "audit" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("audit")}
          className="text-xs gap-1.5"
        >
          <Shield className="h-3.5 w-3.5" />
          Audit Trail ({data.recentAuditLogs.length})
        </Button>
      </div>

      {/* ── Tab 1: Processing Jobs ───────────────────────────────────────── */}
      {activeTab === "jobs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Document Ingestion Processing Queue
            </CardTitle>
            <CardDescription>
              Real-time pipeline health, page extraction progress, and background error tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.operationalJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No background processing jobs recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Document Title</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Attempts</th>
                      <th className="p-3">Error Diagnosis</th>
                      <th className="p-3">Logged</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.operationalJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/30">
                        <td className="p-3 font-medium text-foreground max-w-xs truncate">
                          {job.documentTitle}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              job.status === "completed"
                                ? "success"
                                : job.status === "failed"
                                  ? "destructive"
                                  : job.status === "retryable"
                                    ? "warning"
                                    : "secondary"
                            }
                            className="text-[10px] uppercase font-mono"
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono">
                          {job.attemptCount} / {job.maxAttempts}
                        </td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">
                          {job.errorMessage || "—"}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono">
                          {new Date(job.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="p-3 text-right">
                          {(job.status === "failed" || job.status === "retryable") && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading[job.id]}
                              onClick={() => handleRetryJob(job.id)}
                              className="h-7 text-xs gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Reported Questions ────────────────────────────────────── */}
      {activeTab === "reports" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Candidate Question Disputes & Reports
            </CardTitle>
            <CardDescription>
              Review flagged items, ambiguous options, or pedagogical dispute tickets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.reportedQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No active question reports submitted.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Question ID</th>
                      <th className="p-3">Issue Category</th>
                      <th className="p-3">Student Comment</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.reportedQuestions.map((report) => (
                      <tr key={report.id} className="hover:bg-muted/30">
                        <td className="p-3 font-mono font-medium">{report.questionId.slice(0, 10)}…</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {report.issueType.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-foreground max-w-xs">{report.comment}</td>
                        <td className="p-3">
                          <Badge
                            variant={
                              report.status === "resolved"
                                ? "success"
                                : report.status === "dismissed"
                                  ? "secondary"
                                  : report.status === "reviewed"
                                    ? "indigo"
                                    : "warning"
                            }
                            className="text-[10px] uppercase font-mono"
                          >
                            {report.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {report.status === "open" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading[report.id]}
                                onClick={() => handleUpdateReportStatus(report.id, "reviewed")}
                                className="h-6 text-[11px] px-2"
                              >
                                Review
                              </Button>
                            )}
                            {report.status !== "resolved" && (
                              <Button
                                variant="default"
                                size="sm"
                                disabled={actionLoading[report.id]}
                                onClick={() => handleUpdateReportStatus(report.id, "resolved")}
                                className="h-6 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Resolve
                              </Button>
                            )}
                            {report.status !== "dismissed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionLoading[report.id]}
                                onClick={() => handleUpdateReportStatus(report.id, "dismissed")}
                                className="h-6 text-[11px] px-2 text-muted-foreground"
                              >
                                Dismiss
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 3: AI Usage & Telemetry ──────────────────────────────────── */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Inference Telemetry & Cost Model
              </CardTitle>
              <CardDescription>
                Server-side token usage, latency budgets, and structured output verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Input Tokens
                  </span>
                  <p className="text-xl font-bold font-mono">
                    {data.aiUsage.totalInputTokens.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Prompt & context tokens</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-purple-500" />
                    Output Tokens
                  </span>
                  <p className="text-xl font-bold font-mono">
                    {data.aiUsage.totalOutputTokens.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Structured JSON generation</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    Average Latency
                  </span>
                  <p className="text-xl font-bold font-mono">{data.aiUsage.avgLatencyMs} ms</p>
                  <p className="text-[11px] text-muted-foreground">Per question tutor explanation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab 4: Audit Trail ───────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              Administrative Audit Log
            </CardTitle>
            <CardDescription>
              Immutable trail of consequential staff actions (job retries, report resolutions, and data purges).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentAuditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No administrative actions recorded in audit log.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target Type</th>
                      <th className="p-3">Target ID</th>
                      <th className="p-3">Admin</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.recentAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{log.targetType}</td>
                        <td className="p-3 font-mono text-muted-foreground">{log.targetId.slice(0, 12)}…</td>
                        <td className="p-3 font-mono text-xs">{log.adminId ? log.adminId.slice(0, 8) : "System"}</td>
                        <td className="p-3 text-muted-foreground font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
