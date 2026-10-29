import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Clock,
  BookOpen,
  Award,
  ChevronRight,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MOCK_STUDENT_STATS, MOCK_MATERIALS } from "@/lib/fixtures/mock-data";

export const metadata: Metadata = {
  title: "Dashboard · StudPilot",
  description: "Monitor your CBT exam preparation, score trends, and AI-generated practice tests.",
};

export default function StudentDashboardPage() {
  const stats = MOCK_STUDENT_STATS;
  const recentExams = stats.recentExams;
  const materials = MOCK_MATERIALS.slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Top Header & Hero Action ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, Amaka 👋
            </h1>
            <Badge variant="indigo" className="hidden sm:inline-flex">JAMB 2026 Candidate</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Your readiness index is currently at <span className="font-semibold text-primary">{stats.averageScorePercentage}%</span>. Ready for your next timed practice sprint?
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/materials">View Materials</Link>
          </Button>
          <Button asChild variant="default" size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
            <Link href="/dashboard/exams/builder">
              <Sparkles className="h-4 w-4" />
              Generate Exam
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Overview ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold text-foreground">{stats.averageScorePercentage}%</p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <TrendingUp className="h-3 w-3" /> +6% from last week
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Exams Completed</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalExamsTaken}</p>
              <p className="text-[11px] text-muted-foreground">{stats.totalQuestionsAnswered} questions scored</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Study Time</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalStudyHours} hrs</p>
              <p className="text-[11px] text-muted-foreground">Avg 25 min / session</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Mastery Tier</p>
              <p className="text-2xl font-bold text-foreground">{stats.masteryLevel}</p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Top 15% cohort rank</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Visual Data Analytics & Subject Progress ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Trend SVG Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Score Trajectory</CardTitle>
                <CardDescription>Progression across your last 8 CBT sessions</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">Target: 80%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Accessible SVG line chart */}
            <div className="h-52 w-full pt-4" aria-label="Score progression chart from 58% to 82%">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                {/* Horizontal guide lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" strokeDasharray="3 3" className="text-border" strokeWidth="1" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="currentColor" strokeDasharray="3 3" className="text-border" strokeWidth="1" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" strokeDasharray="3 3" className="text-border" strokeWidth="1" />
                
                {/* Target line */}
                <line x1="0" y1="36" x2="500" y2="36" stroke="#6366f1" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.6" />
                <text x="4" y="32" fill="#6366f1" fontSize="10" fontWeight="bold">80% Target</text>

                {/* Score polygon area */}
                <polygon
                  points="20,105 85,97 150,91 215,79 280,85 345,65 410,73 475,57 475,150 20,150"
                  fill="url(#gradient-accent)"
                  opacity="0.25"
                />

                {/* Score path line */}
                <polyline
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="20,105 85,97 150,91 215,79 280,85 345,65 410,73 475,57"
                />

                {/* Data Points */}
                {[
                  { x: 20, y: 105, val: "58%" },
                  { x: 85, y: 97, val: "62%" },
                  { x: 150, y: 91, val: "65%" },
                  { x: 215, y: 79, val: "71%" },
                  { x: 280, y: 85, val: "68%" },
                  { x: 345, y: 65, val: "78%" },
                  { x: 410, y: 73, val: "74%" },
                  { x: 475, y: 57, val: "82%" },
                ].map((pt, idx) => (
                  <g key={idx}>
                    <circle cx={pt.x} cy={pt.y} r="4" fill="#4f46e5" className="stroke-background stroke-2" />
                    <text x={pt.x} y={pt.y - 8} textAnchor="middle" fontSize="10" className="fill-foreground font-semibold">
                      {pt.val}
                    </text>
                  </g>
                ))}

                <defs>
                  <linearGradient id="gradient-accent" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t border-border mt-3">
              <span>Exam 1 (Diagnostic)</span>
              <span>Exam 4 (Midpoint)</span>
              <span>Exam 8 (Latest)</span>
            </div>
          </CardContent>
        </Card>

        {/* Subject Mastery Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Subject Accuracies</CardTitle>
            <CardDescription>Accuracy by curriculum subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.subjectPerformance.map((subj) => (
              <div key={subj.subject} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">{subj.subject}</span>
                  <span className="text-muted-foreground font-semibold">{subj.accuracy}%</span>
                </div>
                <Progress value={subj.accuracy} className="h-2" />
              </div>
            ))}

            <div className="pt-2">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Weak Topic Identified
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Vector Cross Products in General Mathematics is currently at 44% accuracy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent CBT Exams & Active Materials ──────────────────────────── */}
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
            <div className="divide-y divide-border">
              {recentExams.map((exam) => (
                <div key={exam.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{exam.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{exam.subject}</span>
                      <span>·</span>
                      <span>{exam.totalQuestions} Questions</span>
                      <span>·</span>
                      <span>{exam.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                        exam.score >= 75
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : exam.score >= 60
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {exam.score}%
                    </span>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                      <Link href={`/exam/${exam.id}/results`}>Review</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ready Materials Library */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Study Material Library</CardTitle>
              <CardDescription>Processed syllabi & reference notes</CardDescription>
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
