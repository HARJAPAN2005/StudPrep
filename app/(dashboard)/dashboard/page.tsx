import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  BookOpen,
  Award,
  ChevronRight,
  CheckCircle2,
  FileText,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MOCK_MATERIALS } from "@/lib/fixtures/mock-data";
import { getAnalyticsDashboardAction } from "@/app/actions/analytics";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard · StudPilot",
  description: "Monitor your CBT exam preparation, score trends, and AI-generated practice tests.",
};

export const instant = false;

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
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
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

/**
 * Derives a mastery tier label from overall average score.
 * No AI, no prediction, no cohort comparison — purely deterministic.
 */
function masteryTierLabel(avgScore: number): string {
  if (avgScore >= 80) return "Distinction";
  if (avgScore >= 65) return "Merit";
  if (avgScore >= 50) return "Pass";
  return "Developing";
}

export default async function StudentDashboardPage() {
  // Fetch real analytics (authorized for the current authenticated student)
  const [analyticsResult, supabase] = await Promise.all([
    getAnalyticsDashboardAction(),
    createClient(),
  ]);

  // Fetch the student's profile for the greeting
  let displayName: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      displayName = profile?.full_name ?? null;
    }
  } catch {
    // Non-critical — greeting degrades gracefully
  }

  const payload = analyticsResult.success ? analyticsResult.payload : null;
  const hasData = payload?.hasData ?? false;
  const recentExams = payload?.examHistory.slice(0, 4) ?? [];
  const materials = MOCK_MATERIALS.slice(0, 3);

  // Compute summary metrics from real data only
  const avgScore = payload?.overallAvgScore ?? 0;
  const totalExams = payload?.totalExams ?? 0;
  const totalQuestions = payload?.totalQuestions ?? 0;
  const totalTimeSeconds = payload?.totalTimeSpentSeconds ?? 0;
  const masteryTier = hasData ? masteryTierLabel(avgScore) : "—";

  // Score delta: only show if trendSufficient and we have 2+ exams
  const trendSufficient = payload?.trendSufficient ?? false;
  const trendPoints = payload?.scoreTrend ?? [];
  let scoreDelta: number | null = null;
  if (trendSufficient && trendPoints.length >= 2) {
    scoreDelta = Math.round(
      trendPoints[trendPoints.length - 1].score - trendPoints[trendPoints.length - 2].score
    );
  }

  // Best weak topic (lowest accuracy, from real data)
  const weakestTopic =
    payload?.topicAnalytics.length
      ? payload.topicAnalytics[0] // already sorted weakest first
      : null;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {displayName ? `Welcome back, ${displayName.split(" ")[0]} 👋` : "Welcome back 👋"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasData
              ? <>Your average score is currently <span className="font-semibold text-primary">{avgScore}%</span>. Ready for your next timed practice sprint?</>
              : "Complete your first exam to unlock analytics and personalised recommendations."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/materials">View Materials</Link>
          </Button>
          <Button
            asChild
            variant="default"
            size="sm"
            className="gap-2 shadow-sm bg-primary hover:bg-primary/90"
          >
            <Link href="/dashboard/exams/builder">
              <Sparkles className="h-4 w-4" />
              Generate Exam
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Overview ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Score */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold text-foreground">
                {hasData ? `${avgScore}%` : "—"}
              </p>
              {/* Only show delta when there is real trend data */}
              {scoreDelta !== null ? (
                <div className={`flex items-center gap-1 text-[11px] font-semibold ${
                  scoreDelta > 0
                    ? "text-emerald-600"
                    : scoreDelta < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
                }`}>
                  {scoreDelta > 0 ? <TrendingUp className="h-3 w-3" /> :
                   scoreDelta < 0 ? <TrendingDown className="h-3 w-3" /> :
                   <Minus className="h-3 w-3" />}
                  {scoreDelta > 0 ? "+" : ""}{scoreDelta}% vs last exam
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {hasData ? "Need 3+ exams for trend" : "No data yet"}
                </p>
              )}
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Exams Completed */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Exams Completed</p>
              <p className="text-2xl font-bold text-foreground">{totalExams}</p>
              <p className="text-[11px] text-muted-foreground">{totalQuestions} questions scored</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Study Time */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Study Time</p>
              <p className="text-2xl font-bold text-foreground">
                {hasData ? formatSeconds(totalTimeSeconds) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">Across all exams</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Mastery Tier — derived from real average score, no cohort rank */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Mastery Tier</p>
              <p className="text-2xl font-bold text-foreground">{masteryTier}</p>
              <p className="text-[11px] text-muted-foreground">
                {hasData
                  ? `Based on ${avgScore}% average score`
                  : "Complete exams to unlock"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Score Trend SVG + Subject Progress ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Score Trajectory</CardTitle>
                <CardDescription>
                  {trendSufficient
                    ? `Progression across your last ${trendPoints.length} exams`
                    : "Complete 3+ exams to see your score trajectory"}
                </CardDescription>
              </div>
              {hasData && <Badge variant="outline" className="text-xs">Best: {payload?.bestScore ?? 0}%</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {!hasData || !trendSufficient ? (
              <div className="h-48 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <BarChart3 className="h-8 w-8 opacity-30" />
                <div className="text-center">
                  <p className="text-sm font-medium">Insufficient data</p>
                  <p className="text-xs mt-1">
                    {!hasData
                      ? "Complete your first exam to see trends."
                      : "Need 3+ exams for trend analysis."}
                  </p>
                </div>
              </div>
            ) : (() => {
              const CHART_W = 500, CHART_H = 140, PAD_X = 28, PAD_Y = 18;
              const innerW = CHART_W - PAD_X * 2, innerH = CHART_H - PAD_Y * 2;
              const scores = trendPoints.map((p) => p.score);
              const minS = Math.max(0, Math.min(...scores) - 8);
              const maxS = Math.min(100, Math.max(...scores) + 8);
              const range = maxS - minS || 1;
              const toX = (i: number) => PAD_X + (i / (trendPoints.length - 1)) * innerW;
              const toY = (s: number) => PAD_Y + innerH - ((s - minS) / range) * innerH;
              const pts = trendPoints.map((p, i) => `${toX(i)},${toY(p.score)}`).join(" ");
              const poly = pts + ` ${toX(trendPoints.length - 1)},${CHART_H} ${PAD_X},${CHART_H}`;

              return (
                <div className="h-48 w-full" aria-label="Score trend chart" role="img">
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
                    <defs>
                      <linearGradient id="dash-trend-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1={PAD_X} y1={PAD_Y + innerH / 2} x2={CHART_W - PAD_X} y2={PAD_Y + innerH / 2}
                      stroke="currentColor" strokeDasharray="3 3" className="text-border" strokeWidth="1" />
                    <polygon points={poly} fill="url(#dash-trend-gradient)" opacity="0.25" />
                    <polyline fill="none" stroke="#4f46e5" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" points={pts} />
                    {trendPoints.map((pt, i) => (
                      <g key={pt.attemptId}>
                        <circle cx={toX(i)} cy={toY(pt.score)} r="4" fill="#4f46e5" className="stroke-background stroke-2" />
                        <text x={toX(i)} y={toY(pt.score) - 8} textAnchor="middle" fontSize="9" className="fill-foreground font-semibold">
                          {pt.score}%
                        </text>
                      </g>
                    ))}
                  </svg>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                    <span>{trendPoints[0]?.label}</span>
                    <span>{trendPoints[trendPoints.length - 1]?.label} (Latest)</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Subject Accuracies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Subject Accuracies</CardTitle>
            <CardDescription>Average score by subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasData || (payload?.subjectBreakdowns.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No subject data yet.</p>
            ) : (
              payload?.subjectBreakdowns.slice(0, 5).map((subj) => (
                <div key={subj.subjectId} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{subj.subjectName}</span>
                    <span className="text-muted-foreground font-semibold font-mono">{subj.avgScore}%</span>
                  </div>
                  <Progress value={subj.avgScore} className="h-2" />
                </div>
              ))
            )}

            {/* Weakest topic alert (real data only) */}
            {weakestTopic && weakestTopic.accuracy < 60 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Weak Topic Identified
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold">{weakestTopic.topic}</span> is at{" "}
                  {weakestTopic.accuracy}% accuracy.
                  {weakestTopic.isLowSample && " (estimate — fewer than 5 questions)"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Exams & Materials ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exams */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Recent CBT Sessions</CardTitle>
              <CardDescription>Review scores and post-exam rationales</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <Link href="/dashboard/analytics">
                All History <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentExams.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <BookOpen className="h-7 w-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No exams completed yet.</p>
                <Button asChild variant="outline" size="sm" className="mt-3 gap-2">
                  <Link href="/dashboard/exams/builder">
                    <Sparkles className="h-3.5 w-3.5" /> Generate First Exam
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentExams.map((exam) => (
                  <div key={exam.attemptId} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{exam.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{exam.subjectName ?? "—"}</span>
                        <span>·</span>
                        <span>{exam.totalQuestions} Questions</span>
                        <span>·</span>
                        <span>{formatDate(exam.submittedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${scoreBadgeClass(exam.score)}`}>
                        {exam.score}%
                      </span>
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                        <Link href={`/exam/${exam.attemptId}/results`}>Review</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Study Material Library (still uses mock until Phase 4 data is live) */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Study Material Library</CardTitle>
              <CardDescription>Processed syllabi &amp; reference notes</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <Link href="/dashboard/materials">
                Library <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {materials.map((mat) => (
                <div key={mat.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/materials/${mat.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {mat.title}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {mat.subjectName} · {mat.pageCount} pages · {mat.generatedQuestionsCount} questions available
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs shrink-0">
                    <Link href={`/dashboard/materials/${mat.id}`}>Inspect</Link>
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Upload any syllabus, lecture note, or textbook PDF</p>
              <Button asChild variant="default" size="sm" className="text-xs h-8">
                <Link href="/dashboard/materials">Upload Material</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
