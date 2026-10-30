"use client";

/**
 * Analytics Dashboard Client Component
 *
 * Renders real performance analytics derived from the student's finalized
 * exam attempts. No mock data — every metric comes from the server-authorized
 * AnalyticsDashboardPayload.
 *
 * Design rules:
 * - Never show a trend when trendSufficient = false
 * - Always show "(Estimate — fewer than 5 questions)" on isLowSample topics
 * - Never show cohort ranks, predicted grades, or fabricated deltas
 * - Score trend chart renders real ScoreTrendPoint data
 *
 * @module app/(dashboard)/analytics/analytics-client
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart3,
  Sparkles,
  AlertTriangle,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Compass,
  ArrowRight,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { generateRevisionPlanAction } from "@/app/actions/analytics";
import type {
  AnalyticsDashboardPayload,
  RevisionPlanOutput,
  SubjectBreakdown,
  TopicAnalytic,
  FiveQuestionsDiagnostic,
} from "@/lib/schemas/analytics";

// ── Helper utilities ──────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function scoreBadgeClass(score: number): string {
  if (score >= 75) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  if (score >= 40) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-red-500/10 text-red-600 dark:text-red-400";
}

function masteryBadgeVariant(level: TopicAnalytic["masteryLevel"]) {
  if (level === "mastered") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
  if (level === "competent") return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
}

function TrendIcon({ trend }: { trend: SubjectBreakdown["scoreTrend"] }) {
  if (trend === "improving") return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" aria-label="Improving" />;
  if (trend === "declining") return <TrendingDown className="h-3.5 w-3.5 text-red-500" aria-label="Declining" />;
  if (trend === "stable") return <Minus className="h-3.5 w-3.5 text-blue-500" aria-label="Stable" />;
  return <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label="Insufficient data" />;
}

// ── Score Trend Chart ─────────────────────────────────────────────────────────

function ScoreTrendChart({
  points,
  trendSufficient,
}: {
  points: AnalyticsDashboardPayload["scoreTrend"];
  trendSufficient: boolean;
}) {
  if (!trendSufficient || points.length < 2) {
    return (
      <div className="h-52 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
        <Info className="h-8 w-8 opacity-40" />
        <div>
          <p className="text-sm font-medium">Insufficient data for trend</p>
          <p className="text-xs mt-1">Complete at least 3 exams to see your score trajectory.</p>
        </div>
      </div>
    );
  }

  const CHART_W = 500;
  const CHART_H = 140;
  const PAD_X = 24;
  const PAD_Y = 20;
  const innerW = CHART_W - PAD_X * 2;
  const innerH = CHART_H - PAD_Y * 2;
  const minScore = Math.max(0, Math.min(...points.map((p) => p.score)) - 10);
  const maxScore = Math.min(100, Math.max(...points.map((p) => p.score)) + 10);
  const range = maxScore - minScore || 1;

  const toX = (i: number) => PAD_X + (i / (points.length - 1)) * innerW;
  const toY = (score: number) => PAD_Y + innerH - ((score - minScore) / range) * innerH;

  const polylinePoints = points.map((p, i) => `${toX(i)},${toY(p.score)}`).join(" ");
  const polygonPoints =
    polylinePoints +
    ` ${toX(points.length - 1)},${CHART_H} ${PAD_X},${CHART_H}`;

  return (
    <div
      className="h-52 w-full pt-2"
      aria-label={`Score trend chart over ${points.length} exams`}
      role="img"
    >
      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <defs>
          <linearGradient id="analytics-trend-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 1, 2].map((i) => {
          const y = PAD_Y + (i / 2) * innerH;
          const label = Math.round(maxScore - (i / 2) * range);
          return (
            <g key={i}>
              <line x1={PAD_X} y1={y} x2={CHART_W - PAD_X} y2={y}
                stroke="currentColor" strokeDasharray="3 3"
                className="text-border" strokeWidth="1" />
              <text x={0} y={y + 4} fontSize="9" className="fill-muted-foreground">{label}%</text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={polygonPoints} fill="url(#analytics-trend-gradient)" opacity="0.3" />

        {/* Line */}
        <polyline
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Data points */}
        {points.map((pt, i) => {
          const cx = toX(i);
          const cy = toY(pt.score);
          return (
            <g key={pt.attemptId}>
              <circle cx={cx} cy={cy} r="4" fill="#4f46e5" className="stroke-background stroke-2" />
              <text x={cx} y={cy - 9} textAnchor="middle" fontSize="9" className="fill-foreground font-semibold">
                {pt.score}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* X axis labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-1 mt-1">
        <span>{points[0]?.label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)]?.label}</span>}
        <span>{points[points.length - 1]?.label} (Latest)</span>
      </div>
    </div>
  );
}

// ── Revision Plan Section ─────────────────────────────────────────────────────

function RevisionPlanSection() {
  const [plan, setPlan] = useState<RevisionPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateRevisionPlanAction();
      if (result.success && result.plan) {
        setPlan(result.plan);
      } else {
        setError(result.error ?? "Failed to generate revision plan. Please try again.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Revision Plan
            </CardTitle>
            <CardDescription>
              Personalised recommendations grounded in your actual exam performance
            </CardDescription>
          </div>
          {!plan && (
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              size="sm"
              className="gap-2 shrink-0"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Revision Plan
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {!plan && !error && !isPending && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              Click &ldquo;Generate Revision Plan&rdquo; to receive AI-powered study recommendations
              based on your performance data.
            </p>
            <p className="text-xs mt-2 text-muted-foreground/70">
              No raw question content or answer keys are shared with the AI.
            </p>
          </div>
        )}

        {plan && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
              <p className="text-sm font-medium text-foreground">{plan.summary}</p>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              {plan.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-border bg-card space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            rec.priority === "critical"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : rec.priority === "high"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {rec.priority}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{rec.topic}</span>
                        {rec.isLowSampleWarning && (
                          <span className="text-[10px] text-muted-foreground italic">
                            (estimate — limited data)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.subject} · {rec.accuracy}% accuracy</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="text-xs shrink-0">
                      <Link href={`/dashboard/exams/builder?topic=${encodeURIComponent(rec.topic)}`}>
                        Drill Topic
                      </Link>
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">{rec.rationale}</p>

                  {rec.suggestedActions.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {rec.suggestedActions.map((action, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Practice sessions suggestion */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Suggested practice sessions</span>
              <span className="font-bold text-foreground">{plan.suggestedPracticeSessionCount}</span>
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-muted-foreground italic border-t border-border pt-3">
              {plan.disclaimer}
            </p>

            {/* Regenerate */}
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Regenerate Plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── The Five Questions Diagnostic View ────────────────────────────────────────

function FiveQuestionsDiagnosticSection({
  fiveQuestions,
}: {
  fiveQuestions: FiveQuestionsDiagnostic;
}) {
  const { whatAmIGoodAt, whereAmILosingMarks, whyAmIMakingMistakes, howAmIImproving, whatShouldIDoNext } = fiveQuestions;

  return (
    <Card className="border-indigo-500/20 bg-gradient-to-b from-indigo-950/10 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Compass className="h-5 w-5 text-indigo-500" />
              The Five Core Diagnostic Questions
            </CardTitle>
            <CardDescription>
              Objective answers to five critical preparation questions, backed by code-calculated metrics
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-400 font-mono w-fit">
            Deterministic Diagnostics
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Question 1: What am I good at? */}
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> 1. What am I good at?
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-800 font-mono">
                {whatAmIGoodAt.strongTopics.length} Strong
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {whatAmIGoodAt.summary}
            </p>
            {whatAmIGoodAt.strongTopics.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-emerald-500/10">
                {whatAmIGoodAt.strongTopics.slice(0, 3).map((t) => (
                  <div key={t.topic} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[150px]">{t.topic}</span>
                    <span className="font-mono text-emerald-500 font-bold">{t.accuracy}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Question 2: Where am I losing marks? */}
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> 2. Where am I losing marks?
              </span>
              <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-800 font-mono">
                {whereAmILosingMarks.weakTopics.length} Weak Topics
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {whereAmILosingMarks.summary}
            </p>
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-rose-500/10 text-center">
              <div className="p-1 rounded bg-rose-950/20">
                <span className="text-[10px] text-muted-foreground block">Penalties</span>
                <span className="text-xs font-mono font-bold text-rose-400">-{whereAmILosingMarks.marksLostBreakdown.penalties}m</span>
              </div>
              <div className="p-1 rounded bg-rose-950/20">
                <span className="text-[10px] text-muted-foreground block">Skipped</span>
                <span className="text-xs font-mono font-bold text-amber-400">{whereAmILosingMarks.marksLostBreakdown.unattemptedMarks} Q</span>
              </div>
              <div className="p-1 rounded bg-rose-950/20">
                <span className="text-[10px] text-muted-foreground block">Wrong</span>
                <span className="text-xs font-mono font-bold text-rose-400">{whereAmILosingMarks.marksLostBreakdown.incorrectMarks} Q</span>
              </div>
            </div>
          </div>

          {/* Question 3: Why am I making mistakes? */}
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <BrainCircuit className="h-4 w-4" /> 3. Why am I making mistakes?
              </span>
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-800 font-mono">
                {whyAmIMakingMistakes.primaryFactors.length} Factors
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {whyAmIMakingMistakes.primaryFactors.length === 0 ? (
                <p>No systematic error pattern detected. Your errors are distributed across independent items.</p>
              ) : (
                whyAmIMakingMistakes.primaryFactors.map((f, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="font-semibold text-amber-700 dark:text-amber-300 text-[11px]">• {f.title}</p>
                    <p className="text-[11px] pl-2 text-muted-foreground">{f.evidence}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Question 4: How am I improving? */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> 4. How am I improving?
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${
                  howAmIImproving.trendStatus === "improving"
                    ? "text-emerald-400 border-emerald-800"
                    : howAmIImproving.trendStatus === "declining"
                      ? "text-rose-400 border-rose-800"
                      : "text-slate-400 border-slate-700"
                }`}
              >
                {howAmIImproving.trendStatus.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {howAmIImproving.summary}
            </p>
            {howAmIImproving.scoreDelta !== null && (
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground pt-1 border-t border-blue-500/10">
                <span>Net Delta:</span>
                <span className={howAmIImproving.scoreDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {howAmIImproving.scoreDelta >= 0 ? "+" : ""}{howAmIImproving.scoreDelta}%
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">across {howAmIImproving.attemptsCount} attempts</span>
              </div>
            )}
          </div>

          {/* Question 5: What should I do next? */}
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10 space-y-2.5 md:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Target className="h-4 w-4" /> 5. What should I do next?
              </span>
              {whatShouldIDoNext.drillUrl && (
                <Button asChild size="sm" variant="default" className="h-7 text-xs gap-1">
                  <Link href={whatShouldIDoNext.drillUrl}>
                    Drill Weakest Topic <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
            <p className="text-xs font-semibold text-foreground">
              {whatShouldIDoNext.recommendedAction}
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-indigo-500/10">
              {whatShouldIDoNext.actionSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Analytics Dashboard Client ──────────────────────────────────────────

interface AnalyticsDashboardClientProps {
  payload: AnalyticsDashboardPayload;
}

export function AnalyticsDashboardClient({ payload }: AnalyticsDashboardClientProps) {
  // Empty state
  if (!payload.hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <BarChart3 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">No exam data yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Complete your first exam to unlock analytics, topic breakdowns, and personalised
            revision recommendations.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/dashboard/exams/builder">
            <Sparkles className="h-4 w-4" />
            Generate Your First Exam
          </Link>
        </Button>
      </div>
    );
  }

  const {
    totalExams,
    totalQuestions,
    totalTimeSpentSeconds,
    overallAvgScore,
    overallAccuracy,
    bestScore,
    skipRate,
    negativeMarkImpact,
    scoreTrend,
    trendSufficient,
    subjectBreakdowns,
    topicAnalytics,
    difficultyBreakdown,
    examHistory,
  } = payload;

  const avgTimePerQ =
    totalQuestions > 0 ? Math.round(totalTimeSpentSeconds / totalQuestions) : 0;

  return (
    <div className="space-y-8">
      {/* ── Summary Metric Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Avg Score", value: `${overallAvgScore}%`, icon: <Target className="h-4 w-4" /> },
          { label: "Accuracy", value: `${overallAccuracy}%`, icon: <CheckCircle2 className="h-4 w-4" /> },
          { label: "Exams Taken", value: String(totalExams), icon: <BookOpen className="h-4 w-4" /> },
          { label: "Questions Done", value: String(totalQuestions), icon: <BarChart3 className="h-4 w-4" /> },
          { label: "Total Time", value: formatSeconds(totalTimeSpentSeconds), icon: <Clock className="h-4 w-4" /> },
          { label: "Avg Time/Q", value: formatSeconds(avgTimePerQ), icon: <Clock className="h-4 w-4" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label}>
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">{icon}
                <span className="text-xs font-medium">{label}</span>
              </div>
              <div className="text-xl font-bold text-foreground font-mono">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Skip rate & negative mark alert (only if relevant) */}
      {(skipRate > 10 || negativeMarkImpact > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {skipRate > 10 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-amber-700 dark:text-amber-400">High Skip Rate: {skipRate}%</p>
                <p className="text-muted-foreground mt-0.5">
                  You&apos;re leaving many questions unanswered. Try time-boxing each question.
                </p>
              </div>
            </div>
          )}
          {negativeMarkImpact > 0 && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-red-700 dark:text-red-400">Negative Marks Lost: {negativeMarkImpact}</p>
                <p className="text-muted-foreground mt-0.5">
                  Incorrect guessing has cost you marks. Review uncertain answers before submitting.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Five Core Diagnostic Questions ───────────────────────────────── */}
      <FiveQuestionsDiagnosticSection fiveQuestions={payload.fiveQuestions} />

      {/* ── Score Trend + Subject Breakdown ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Score Trajectory</CardTitle>
                <CardDescription>
                  {trendSufficient
                    ? `Score progression across ${scoreTrend.length} exams`
                    : "Complete at least 3 exams to see your score trend"}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">Best: {bestScore}%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart points={scoreTrend} trendSufficient={trendSufficient} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Subject Performance</CardTitle>
            <CardDescription>Average score by subject area</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectBreakdowns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subject data available.</p>
            ) : (
              subjectBreakdowns.map((subj) => (
                <div key={subj.subjectId} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <TrendIcon trend={subj.scoreTrend} />
                      <span className="text-foreground">{subj.subjectName}</span>
                    </div>
                    <span className="font-bold font-mono text-foreground">{subj.avgScore}%</span>
                  </div>
                  <Progress value={subj.avgScore} className="h-2" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{subj.examCount} exams</span>
                    <span>
                      {subj.scoreTrend === "insufficient_data"
                        ? "Need 3+ exams for trend"
                        : subj.scoreTrend.charAt(0).toUpperCase() + subj.scoreTrend.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Difficulty Breakdown ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Difficulty Breakdown</CardTitle>
          <CardDescription>Accuracy on easy, medium, and hard questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {(["easy", "medium", "hard"] as const).map((level) => {
              const b = difficultyBreakdown[level];
              return (
                <div key={level} className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize text-foreground">{level}</span>
                    <span className="font-mono text-muted-foreground">{b.total} Q</span>
                  </div>
                  <Progress value={b.total > 0 ? b.accuracy : 0} className="h-3" />
                  <p className="text-xs font-bold text-center font-mono text-foreground">
                    {b.total > 0 ? `${b.accuracy}%` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Topic Mastery Grid ───────────────────────────────────────────── */}
      {topicAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Topic Mastery
            </CardTitle>
            <CardDescription>
              Sorted weakest first · Topics flagged &ldquo;Estimate&rdquo; have fewer than 5 questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topicAnalytics.map((topic) => (
                <div
                  key={topic.topic}
                  className="p-3.5 rounded-xl border border-border bg-card space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{topic.topic}</p>
                      {topic.isLowSample && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                          Estimate — fewer than 5 questions
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 ${masteryBadgeVariant(topic.masteryLevel)}`}
                    >
                      {topic.masteryLevel.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Accuracy (attempted)</span>
                      <span className="font-mono font-semibold">{topic.accuracy}%</span>
                    </div>
                    <Progress value={topic.accuracy} className="h-2" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{topic.correctCount}✓ {topic.incorrectCount}✗ {topic.unansweredCount}—</span>
                      <span>{topic.totalQuestions} Q total</span>
                    </div>
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full text-xs h-7">
                    <Link href={`/dashboard/exams/builder?topic=${encodeURIComponent(topic.topic)}`}>
                      Drill This Topic
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AI Revision Plan ─────────────────────────────────────────────── */}
      <RevisionPlanSection />

      {/* ── Exam History Table ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Complete Exam History</CardTitle>
          <CardDescription>All finalized exams with drill-down review links</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Exam Title</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Questions</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-4 text-right">Time</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {examHistory.map((exam) => (
                  <tr key={exam.attemptId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground max-w-[180px] truncate">
                      {exam.title}
                      {exam.attemptNumber > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground font-normal">
                          (#{exam.attemptNumber})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {exam.subjectName ?? exam.subjectId}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs font-mono">
                      {formatDate(exam.submittedAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground text-xs">
                      {exam.totalQuestions}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBadgeClass(exam.score)}`}>
                        {exam.score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                      {exam.accuracy}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                      {formatSeconds(exam.timeSpentSeconds)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                        <Link href={`/exam/${exam.attemptId}/results`}>Review</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

