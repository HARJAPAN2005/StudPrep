import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MOCK_STUDENT_STATS } from "@/lib/fixtures/mock-data";

export const metadata: Metadata = {
  title: "Analytics & Progress · StudPilot",
  description: "Track your CBT exam performance trends, subject accuracies, and revision diagnostics.",
};

export default function AnalyticsPage() {
  const stats = MOCK_STUDENT_STATS;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Analytics & Readiness Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Data-driven insights to pinpoint weak areas before sitting official examination boards.
          </p>
        </div>

        <Button asChild variant="default" size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
          <Link href="/dashboard/exams/builder">
            <Sparkles className="h-4 w-4" /> Start Diagnostic Test
          </Link>
        </Button>
      </div>

      {/* ── Top Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Historical Average</span>
            <div className="text-2xl font-bold text-foreground">{stats.averageScorePercentage}%</div>
            <p className="text-[11px] text-emerald-600 font-semibold">+8% over last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Pacing Average</span>
            <div className="text-2xl font-bold text-foreground font-mono">1m 12s</div>
            <p className="text-[11px] text-muted-foreground">48s faster than target</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Questions Scored</span>
            <div className="text-2xl font-bold text-foreground">{stats.totalQuestionsAnswered}</div>
            <p className="text-[11px] text-muted-foreground">{stats.totalExamsTaken} complete tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Predicted Grade</span>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Distinction</div>
            <p className="text-[11px] text-muted-foreground">High confidence estimate</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Subject Breakdown & Weak Topic Remediation ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Subject Competency Breakdown
            </CardTitle>
            <CardDescription>Accuracy and question density across target curricula</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {stats.subjectPerformance.map((subj) => (
                <div key={subj.subject} className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-foreground">{subj.subject}</span>
                    <span className="font-bold text-foreground font-mono">{subj.accuracy}%</span>
                  </div>
                  <Progress value={subj.accuracy} className="h-2.5" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{subj.examsCount} practice sessions recorded</span>
                    <span>Target: 75%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Identified Remediation Focus */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Focus Remediation Topics
            </CardTitle>
            <CardDescription>Areas scoring below 60% accuracy threshold</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.weakTopics.map((topic) => (
              <div
                key={topic.topic}
                className="p-3.5 rounded-xl border border-border bg-card space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{topic.topic}</span>
                  <Badge variant="warning" className="text-[10px] py-0 font-mono">
                    {topic.accuracy}% accuracy
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{topic.subject}</p>
                <Button asChild variant="outline" size="sm" className="w-full text-xs h-7 mt-1">
                  <Link href={`/dashboard/exams/builder?topic=${encodeURIComponent(topic.topic)}`}>
                    Drill This Topic
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Historic CBT Session Log ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Complete Session History</CardTitle>
          <CardDescription>Full log of practice sessions with detailed question review links</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Exam Session</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Pacing</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">{exam.title}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{exam.subject}</td>
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">{exam.date}</td>
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">{exam.durationMinutes} mins</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          exam.score >= 75
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {exam.score}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                        <Link href={`/exam/${exam.id}/results`}>Review</Link>
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
