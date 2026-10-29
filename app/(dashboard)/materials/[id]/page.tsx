import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  BookOpen,
  BarChart,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MOCK_MATERIALS } from "@/lib/fixtures/mock-data";

export const metadata: Metadata = {
  title: "Material Analysis · StudPilot",
  description: "Detailed curriculum breakdown, key topics, and AI question analysis.",
};

export function generateStaticParams() {
  return MOCK_MATERIALS.map((material) => ({
    id: material.id,
  }));
}

interface MaterialDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MaterialDetailPage({ params }: MaterialDetailPageProps) {
  const { id } = await params;
  const material = MOCK_MATERIALS.find((m) => m.id === id) || MOCK_MATERIALS[0];

  if (!material) {
    notFound();
  }

  const totalQuestions = material.generatedQuestionsCount;
  const easyPct = totalQuestions ? Math.round((material.difficultyBreakdown.easy / totalQuestions) * 100) : 0;
  const medPct = totalQuestions ? Math.round((material.difficultyBreakdown.medium / totalQuestions) * 100) : 0;
  const hardPct = totalQuestions ? Math.round((material.difficultyBreakdown.hard / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Breadcrumb / Back Navigation ──────────────────────────────────── */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2 mb-2">
          <Link href="/dashboard/materials">
            <ArrowLeft className="h-4 w-4" /> Back to Material Library
          </Link>
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={material.status === "ready" ? "success" : "warning"} className="capitalize">
                {material.status}
              </Badge>
              <Badge variant="outline">{material.subjectName}</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {material.title}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{material.filename}</span>
              <span>·</span>
              <span>{material.fileSizeFormatted}</span>
              <span>·</span>
              <span>{material.pageCount} Pages</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/materials">Upload Another</Link>
            </Button>
            <Button asChild variant="default" size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
              <Link href={`/dashboard/exams/builder?material=${material.id}`}>
                <Sparkles className="h-4 w-4" />
                Build Exam from Document
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Analysis Overview Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document Abstract & Scope */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Document Scope & Syllabus Coverage
            </CardTitle>
            <CardDescription>Synthesized concepts extracted from uploaded reference pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-foreground/90 leading-relaxed">
              {material.summary}
            </p>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Extracted Primary Topics ({material.keyTopics.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {material.keyTopics.map((topic, i) => (
                  <div
                    key={topic}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card/60 text-xs font-medium"
                  >
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-mono text-[10px] flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="text-foreground">{topic}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-semibold text-foreground">Security & Integrity Assurance</span>
                <p className="text-muted-foreground leading-relaxed">
                  Extracted text is processed strictly as untrusted data inputs. No exam answer keys or model reasoning traces are transmitted to student clients prior to authenticated submission.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart className="h-4 w-4 text-primary" /> Question Distribution
            </CardTitle>
            <CardDescription>{totalQuestions} generated practice items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Easy
                </span>
                <span className="text-muted-foreground">{material.difficultyBreakdown.easy} items ({easyPct}%)</span>
              </div>
              <Progress value={easyPct} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span> Medium
                </span>
                <span className="text-muted-foreground">{material.difficultyBreakdown.medium} items ({medPct}%)</span>
              </div>
              <Progress value={medPct} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Hard
                </span>
                <span className="text-muted-foreground">{material.difficultyBreakdown.hard} items ({hardPct}%)</span>
              </div>
              <Progress value={hardPct} className="h-2" />
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">AI Validation Score:</span>
                <span className="font-semibold text-emerald-600">98.4% Confidence</span>
              </div>
              <Button asChild className="w-full text-xs gap-2">
                <Link href={`/dashboard/exams/builder?material=${material.id}`}>
                  <Sparkles className="h-3.5 w-3.5" /> Start Test Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
