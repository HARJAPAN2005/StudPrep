"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  FileText,
  AlertTriangle,
  Flag,
  Send,
  Loader2,
  Layers,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DetailedExamReviewPayload } from "@/app/actions/grading";
import { reportQuestionAction } from "@/app/actions/grading";
import type { ReportIssueType } from "@/lib/schemas/grading";

interface ResultsClientProps {
  initialPayload: DetailedExamReviewPayload;
}

type QuestionFilter = "all" | "correct" | "incorrect" | "unanswered" | "flagged";

export function ResultsClient({ initialPayload }: ResultsClientProps) {
  const {
    title,
    attemptNumber,
    timeSpentSeconds,
    grading,
    comparison,
  } = initialPayload;

  const [activeFilter, setActiveFilter] = React.useState<QuestionFilter>("all");
  const [activeTab, setActiveTab] = React.useState<"review" | "sections" | "topics">("review");

  // Reporting Dialog State
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);
  const [reportingQuestionId, setReportingQuestionId] = React.useState<string | null>(null);
  const [issueType, setIssueType] = React.useState<ReportIssueType>("incorrect_answer_key");
  const [reportComment, setReportComment] = React.useState("");
  const [isSubmittingReport, setIsSubmittingReport] = React.useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = React.useState<string | null>(null);
  const [reportedQuestionsMap, setReportedQuestionsMap] = React.useState<Record<string, boolean>>({});

  const totalQuestions = grading.totalQuestions;
  const avgSecondsPerQ = totalQuestions > 0 ? Math.round(timeSpentSeconds / totalQuestions) : 0;

  // Filter questions
  const filteredQuestions = React.useMemo(() => {
    return grading.detailedResults.filter((q) => {
      if (activeFilter === "correct") return q.isCorrect;
      if (activeFilter === "incorrect") return q.isAttempted && !q.isCorrect;
      if (activeFilter === "unanswered") return !q.isAttempted;
      if (activeFilter === "flagged") return q.needsVerification;
      return true;
    });
  }, [grading.detailedResults, activeFilter]);

  const handleOpenReportDialog = (questionId: string) => {
    setReportingQuestionId(questionId);
    setIssueType("incorrect_answer_key");
    setReportComment("");
    setReportSuccessMsg(null);
    setReportDialogOpen(true);
  };

  const handleSendReport = async () => {
    if (!reportingQuestionId) return;
    setIsSubmittingReport(true);
    try {
      const res = await reportQuestionAction({
        attemptId: initialPayload.attemptId,
        questionId: reportingQuestionId,
        issueType,
        comment: reportComment,
      });

      if (res.success) {
        setReportSuccessMsg("Report submitted successfully. Our academic reviewers will verify this question.");
        setReportedQuestionsMap((prev) => ({ ...prev, [reportingQuestionId]: true }));
        setTimeout(() => {
          setReportDialogOpen(false);
        }, 1500);
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-8 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
        {/* ── Top Header & Actions ─────────────────────────────────────────── */}
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="indigo" className="gap-1.5 font-mono text-xs">
                <ShieldCheck className="h-3.5 w-3.5" /> Deterministic Marking Complete
              </Badge>
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-800">
                Attempt #{attemptNumber}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Results & Diagnostics: {title}
            </h1>
            <p className="text-xs text-slate-400">
              Evaluated via server-side deterministic scoring engine. AI was not used as authoritative grader.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-slate-800 text-slate-200 hover:bg-slate-900 gap-1.5"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
            >
              <Link href="/dashboard/exams/builder">
                <RotateCcw className="h-4 w-4" /> Retake Exam
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Historical Attempt Comparison Banner ──────────────────────────── */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Award className="h-4 w-4 text-indigo-400 shrink-0" />
            {comparison.isBaseline ? (
              <span className="text-slate-300">
                <strong className="text-indigo-400">Baseline Assessment:</strong> This is your initial verified attempt for this exam configuration. Future retakes will measure progress directly against this baseline.
              </span>
            ) : (
              <span className="text-slate-300">
                <strong className="text-white">Progress Tracking:</strong> Compared to your previous attempt (
                <strong className="text-slate-200">{comparison.previousScore}%</strong>), your score changed by{" "}
                <strong
                  className={`font-mono text-sm ${
                    (comparison.scoreDelta ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {(comparison.scoreDelta ?? 0) >= 0 ? `+${comparison.scoreDelta}` : comparison.scoreDelta}%
                </strong>
                . (Best Score: <span className="font-mono text-slate-200">{comparison.bestScore}%</span> across {comparison.previousAttemptsCount + 1} attempts).
              </span>
            )}
          </div>
        </div>

        {/* ── Score & Performance Metrics Grid ──────────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative flex items-center justify-center">
              <div className="h-32 w-32 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center bg-slate-900/80 shadow-inner">
                <span className="text-3xl font-extrabold text-white font-mono">{grading.score}%</span>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Score</span>
              </div>
            </div>

            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="text-lg font-bold text-white">
                  {grading.score >= 75
                    ? "Distinction Standard"
                    : grading.score >= 50
                    ? "Proficient Pass"
                    : "Needs Focused Revision"}
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Marks Earned: <span className="text-emerald-400 font-bold font-mono">{grading.marksObtained}</span> / {grading.maxMarks} max marks.
              </p>
              <p className="text-xs text-slate-400">
                Accuracy: <strong className="text-indigo-400 font-mono">{grading.accuracy}%</strong> of attempted questions answered correctly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto text-xs">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-slate-400 block mb-0.5">Correct</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {grading.correctCount}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-slate-400 block mb-0.5">Incorrect</span>
              <span className="text-base font-bold text-rose-400 font-mono">
                {grading.incorrectCount}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-slate-400 block mb-0.5">Unanswered</span>
              <span className="text-base font-bold text-slate-400 font-mono">
                {grading.unansweredCount}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-slate-400 block mb-0.5">Pacing</span>
              <span className="text-base font-bold text-indigo-300 font-mono">
                {avgSecondsPerQ}s / Q
              </span>
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs (Review vs Section Diagnostics vs Topic Mastery) ─ */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "review"
                ? "border-indigo-500 text-white bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="h-4 w-4" /> Item Review ({grading.detailedResults.length})
          </button>
          {Object.keys(grading.sectionScores).length > 0 && (
            <button
              onClick={() => setActiveTab("sections")}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
                activeTab === "sections"
                  ? "border-indigo-500 text-white bg-slate-900/50"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="h-4 w-4" /> Section Breakdown ({Object.keys(grading.sectionScores).length})
            </button>
          )}
          <button
            onClick={() => setActiveTab("topics")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "topics"
                ? "border-indigo-500 text-white bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Trophy className="h-4 w-4" /> Topic Mastery ({Object.keys(grading.topicScores).length})
          </button>
        </div>

        {/* ── Tab Content: Section Breakdown ─────────────────────────────────── */}
        {activeTab === "sections" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in-50 duration-200">
            {Object.values(grading.sectionScores).map((sec) => (
              <div
                key={sec.sectionId}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">{sec.title}</h3>
                  <Badge variant="indigo" className="font-mono text-xs">
                    {sec.percentage}% Score
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Earned / Max</span>
                    <span className="font-mono font-bold text-white">
                      {sec.marksObtained} / {sec.maxMarks}m
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Accuracy</span>
                    <span className="font-mono font-bold text-indigo-400">{sec.accuracy}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Correct / Attempted</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {sec.correctCount} / {sec.correctCount + sec.incorrectCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab Content: Topic Mastery Profiles ────────────────────────────── */}
        {activeTab === "topics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in-50 duration-200">
            {Object.values(grading.topicScores).map((top) => (
              <div
                key={top.topic}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm truncate">{top.topic}</h3>
                  {top.masteryLevel === "mastered" ? (
                    <Badge variant="success" className="text-[10px]">
                      Mastered
                    </Badge>
                  ) : top.masteryLevel === "competent" ? (
                    <Badge variant="indigo" className="text-[10px]">
                      Competent
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      Needs Review
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Score: <strong className="font-mono text-white">{top.percentage}%</strong></span>
                  <span>Accuracy: <strong className="font-mono text-indigo-400">{top.accuracy}%</strong></span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Marks: {top.marksObtained} / {top.maxMarks}m</span>
                  <span>{top.correctCount} of {top.correctCount + top.incorrectCount} correct</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab Content: Question-by-Question Item Review ──────────────────── */}
        {activeTab === "review" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                {(["all", "correct", "incorrect", "unanswered", "flagged"] as QuestionFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                      activeFilter === filter
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredQuestions.length} of {totalQuestions} questions
              </span>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => {
                const isCorrect = q.isCorrect;
                const isUnanswered = !q.isAttempted;
                const isReported = reportedQuestionsMap[q.questionId];

                return (
                  <div
                    key={q.questionId}
                    className={`p-6 rounded-2xl border transition-all ${
                      isCorrect
                        ? "border-emerald-500/30 bg-emerald-950/10"
                        : isUnanswered
                        ? "border-slate-800 bg-slate-900/40"
                        : "border-rose-500/30 bg-rose-950/10"
                    }`}
                  >
                    {/* Item Top Bar */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300">
                          Q{idx + 1}
                        </span>

                        {isCorrect ? (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Correct (+{q.marksAwarded}m)
                          </Badge>
                        ) : isUnanswered ? (
                          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                            Unanswered (0m)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <XCircle className="h-3 w-3" /> Incorrect ({q.marksAwarded}m)
                          </Badge>
                        )}

                        {q.isAiGenerated ? (
                          <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-800/60 gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> AI Synthesized
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-800/60 gap-1">
                            <FileText className="h-2.5 w-2.5" /> Source Paper
                          </Badge>
                        )}

                        {q.needsVerification && (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> Pending Review
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                          Page {q.sourceReference.pageNumber || 1}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReportDialog(q.questionId)}
                          disabled={isReported}
                          className="h-7 text-[11px] text-slate-400 hover:text-rose-400 gap-1 px-2"
                        >
                          <Flag className="h-3 w-3" />
                          {isReported ? "Reported" : "Report Issue"}
                        </Button>
                      </div>
                    </div>

                    {/* Question Stem */}
                    <p className="text-sm font-medium text-slate-100 leading-relaxed mb-4">
                      {q.body}
                    </p>

                    {/* Options Review Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
                      {q.options.map((opt) => {
                        const isOptionCorrect = opt.id.toLowerCase() === q.correctOptionId.toLowerCase();
                        const isOptionSelected = opt.id.toLowerCase() === (q.submittedOptionId || "").toLowerCase();

                        let optClass = "border-slate-800 bg-slate-900/60 text-slate-400";
                        if (isOptionCorrect) {
                          optClass = "border-emerald-500 bg-emerald-950/40 text-emerald-200 font-semibold ring-1 ring-emerald-500/30";
                        } else if (isOptionSelected) {
                          optClass = "border-rose-500 bg-rose-950/40 text-rose-200 line-through ring-1 ring-rose-500/30";
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border flex items-start gap-2.5 ${optClass}`}
                          >
                            <span className="font-bold font-mono">{opt.label}.</span>
                            <div className="flex-1 space-y-1">
                              <span className="block leading-snug">{opt.text}</span>
                              {opt.explanation && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {opt.explanation}
                                </span>
                              )}
                            </div>
                            {isOptionCorrect && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            )}
                            {isOptionSelected && !isOptionCorrect && (
                              <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Step-by-Step Worked Solution & Core Concept */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Worked Solution:
                      </div>
                      <p className="text-slate-300 text-[12px] leading-relaxed">
                        {q.explanation}
                      </p>

                      {q.sourceReference.evidenceSnippet && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-1.5">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span>
                            <strong>Source Evidence:</strong> &ldquo;{q.sourceReference.evidenceSnippet}&rdquo; (Page {q.sourceReference.pageNumber})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Candidate Question Report Dialog ──────────────────────────────── */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Flag className="h-4 w-4 text-rose-400" /> Report Question Issue
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Submit academic feedback regarding ambiguous questions, incorrect answer keys, or formatting errors.
              </DialogDescription>
            </DialogHeader>

            {reportSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                {reportSuccessMsg}
              </div>
            ) : (
              <div className="space-y-4 py-2 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium block">Issue Category</label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as ReportIssueType)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="incorrect_answer_key">Incorrect Answer Key</option>
                    <option value="ambiguous_question">Ambiguous / Multiple Valid Answers</option>
                    <option value="typo_formatting">Typo or Formatting Mistake</option>
                    <option value="outdated_syllabus">Outdated Syllabus / Irrelevant Topic</option>
                    <option value="other">Other Academic Discrepancy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium block">Additional Notes / Evidence</label>
                  <textarea
                    rows={3}
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    placeholder="Provide textbook citation or specify why you believe the answer key is disputed..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportDialogOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Close
              </Button>
              {!reportSuccessMsg && (
                <Button
                  size="sm"
                  onClick={handleSendReport}
                  disabled={isSubmittingReport}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Submit Report
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
