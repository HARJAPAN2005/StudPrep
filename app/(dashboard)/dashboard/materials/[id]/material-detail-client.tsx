"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Sparkles,
  BookOpen,
  HelpCircle,
  BarChart,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Flag,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  retryDocumentAction,
  deleteDocumentAction,
  getDocumentPreviewUrlAction,
} from "@/app/actions/documents";
import {
  runMaterialAnalysisAction,
  correctMaterialMetadataAction,
  flagExtractionMistakeAction,
} from "@/app/actions/intelligence";
import type {
  TopicItem,
  DetectedQuestion,
  ExaminationType,
  EducationalLevel,
} from "@/lib/ai/schemas";

export interface ExtractedPageItem {
  pageNumber: number;
  extractedText: string;
  wordCount: number;
  hasLowText: boolean;
}

export interface MaterialDetailData {
  id: string;
  title: string;
  filename: string;
  subjectName: string;
  fileSizeFormatted: string;
  pageCount: number;
  status: "queued" | "processing" | "ready" | "completed" | "failed" | "retryable";
  errorMessage?: string | null;
  extractionWarnings: string[];
  keyTopics: string[];
  summary: string;
  generatedQuestionsCount: number;
  difficultyBreakdown: { easy: number; medium: number; hard: number };
  pages: ExtractedPageItem[];
  // Phase 5 AI Document Intelligence Data
  classification?: {
    subject: string;
    educationalLevel: string;
    examinationType: string;
    confidence: number;
    likelyLanguage: string;
    reasoning: string;
  };
  topicsHierarchy?: TopicItem[];
  extractedQuestions?: DetectedQuestion[];
  contentMap?: {
    totalTopics: number;
    coveragePercentage: number;
    estimatedDepth: string;
    identifiedGaps: string[];
    recommendedPrerequisites: string[];
  };
}

export function MaterialDetailClient({ data }: { data: MaterialDetailData }) {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = React.useState(1);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [signedPreviewUrl, setSignedPreviewUrl] = React.useState<string | null>(null);
  const [copiedPage, setCopiedPage] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<{ text: string; error?: boolean } | null>(null);

  // Metadata Edit Dialog State
  const [isEditMetadataOpen, setIsEditMetadataOpen] = React.useState(false);
  const [editSubject, setEditSubject] = React.useState(data.classification?.subject || data.subjectName);
  const [editExam, setEditExam] = React.useState(data.classification?.examinationType || "JAMB_UTME");
  const [editLevel, setEditLevel] = React.useState(data.classification?.educationalLevel || "senior_secondary");

  // Flag Mistake Dialog State
  const [isFlagOpen, setIsFlagOpen] = React.useState(false);
  const [flagQuestion, setFlagQuestion] = React.useState<DetectedQuestion | null>(null);
  const [flagReason, setFlagReason] = React.useState("");

  const totalPages = data.pages.length || data.pageCount || 1;
  const currentPageData = data.pages.find((p) => p.pageNumber === selectedPage) || {
    pageNumber: selectedPage,
    extractedText: `[Extracted syllabus text for Page ${selectedPage}]: Curriculum topics covering core concepts and examination scope.`,
    wordCount: 142,
    hasLowText: false,
  };

  const detectedQuestions = data.extractedQuestions || [];
  const topicsHierarchy = data.topicsHierarchy || [];
  const contentMap = data.contentMap || {
    totalTopics: topicsHierarchy.length || 4,
    coveragePercentage: 88,
    estimatedDepth: "intermediate",
    identifiedGaps: ["Advanced calculus proofs", "Electromagnetism wave optics"],
    recommendedPrerequisites: ["Senior Secondary Mathematics", "Basic Physics"],
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setActionMessage(null);
    try {
      const res = await runMaterialAnalysisAction(data.id);
      if (res.success) {
        setActionMessage({ text: "AI Document Intelligence analysis completed successfully!" });
        router.refresh();
      } else {
        setActionMessage({ text: res.error ?? "Analysis failed.", error: true });
      }
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Analysis failed.", error: true });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMetadata = async () => {
    try {
      const res = await correctMaterialMetadataAction(data.id, {
        subject: editSubject,
        examinationType: editExam as ExaminationType,
        educationalLevel: editLevel as EducationalLevel,
      });
      if (res.success) {
        setActionMessage({ text: "Metadata correction saved." });
        setIsEditMetadataOpen(false);
        router.refresh();
      } else {
        setActionMessage({ text: res.error ?? "Failed to save correction.", error: true });
      }
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Error saving correction.", error: true });
    }
  };

  const handleFlagSubmit = async () => {
    if (!flagQuestion) return;
    try {
      const res = await flagExtractionMistakeAction(data.id, {
        field: `question_${flagQuestion.questionNumber}`,
        reason: flagReason,
        originalValue: flagQuestion,
      });
      if (res.success) {
        setActionMessage({ text: res.message ?? "Mistake reported." });
        setIsFlagOpen(false);
        setFlagQuestion(null);
        setFlagReason("");
      } else {
        setActionMessage({ text: res.error ?? "Failed to flag mistake.", error: true });
      }
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Error flagging.", error: true });
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setActionMessage(null);
    try {
      const res = await retryDocumentAction(data.id);
      if (res.success) {
        setActionMessage({ text: res.message ?? "Retry initiated successfully." });
        router.refresh();
      } else {
        setActionMessage({ text: res.message ?? "Retry failed.", error: true });
      }
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Retry failed.", error: true });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteDocumentAction(data.id);
      if (res.success) {
        router.push("/dashboard/materials");
      } else {
        setActionMessage({ text: res.error ?? "Failed to delete.", error: true });
        setIsDeleteDialogOpen(false);
      }
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Delete failed.", error: true });
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFetchPreview = async () => {
    if (signedPreviewUrl) return;
    try {
      const res = await getDocumentPreviewUrlAction(data.id);
      if (res.success && res.signedUrl) {
        setSignedPreviewUrl(res.signedUrl);
      }
    } catch {
      // preview url unavailable in mock context
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(currentPageData.extractedText);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Action Message Alert */}
      {actionMessage && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
            actionMessage.error
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={
                data.status === "ready" || data.status === "completed"
                  ? "success"
                  : data.status === "failed"
                  ? "destructive"
                  : "warning"
              }
              className="capitalize"
            >
              {data.status}
            </Badge>
            <Badge variant="outline">{data.classification?.subject || data.subjectName}</Badge>
            {data.classification && (
              <Badge variant="indigo" className="gap-1 text-[11px] font-mono">
                <GraduationCap className="h-3 w-3" /> {data.classification.examinationType}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {data.title}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <FileText className="h-4 w-4" />
            <span>{data.filename}</span>
            <span>·</span>
            <span>{data.fileSizeFormatted}</span>
            <span>·</span>
            <span>{data.pageCount} Pages</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setIsEditMetadataOpen(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit Metadata
          </Button>

          <Button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
            {isAnalyzing ? "Analyzing…" : "Run AI Intelligence"}
          </Button>

          {(data.status === "failed" || data.status === "retryable") && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Retrying…" : "Retry Extraction"}
            </Button>
          )}

          <Button
            onClick={() => setIsDeleteDialogOpen(true)}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>

          {(data.status === "ready" || data.status === "completed") && (
            <Button asChild variant="default" size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
              <Link href={`/dashboard/exams/builder?material=${data.id}`}>
                <Sparkles className="h-4 w-4" />
                Build Exam
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Extraction Warnings Alert */}
      {data.extractionWarnings.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Document Ingestion & Intelligence Warnings</span>
          </div>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            {data.extractionWarnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Interactive Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="overview">Overview & Classification</TabsTrigger>
          <TabsTrigger value="topics">Topic Hierarchy ({topicsHierarchy.length})</TabsTrigger>
          <TabsTrigger value="questions">Extracted Questions ({detectedQuestions.length})</TabsTrigger>
          <TabsTrigger value="contentmap">Content Map & Gaps</TabsTrigger>
          <TabsTrigger value="preview">Per-Page Text ({totalPages})</TabsTrigger>
          <TabsTrigger value="viewer" onClick={handleFetchPreview}>
            PDF Viewer
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview & Classification */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Document Scope & Syllabus Coverage
                </CardTitle>
                <CardDescription>Synthesized concepts extracted from uploaded reference pages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {data.summary}
                </p>

                {/* Classification Inferences Card */}
                {data.classification && (
                  <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" /> AI Classification Diagnostics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Subject</span>
                        <span className="font-semibold text-foreground">{data.classification.subject}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Target Board</span>
                        <span className="font-semibold text-foreground">{data.classification.examinationType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Level</span>
                        <span className="font-semibold text-foreground capitalize">
                          {data.classification.educationalLevel.replace("_", " ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Confidence</span>
                        <span className="font-semibold text-emerald-600 font-mono">
                          {Math.round(data.classification.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    {data.classification.reasoning && (
                      <p className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-2">
                        &quot;{data.classification.reasoning}&quot;
                      </p>
                    )}
                  </div>
                )}

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

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-primary" /> Curriculum Readiness
                </CardTitle>
                <CardDescription>Curriculum alignment & depth</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Syllabus Coverage</span>
                    <span className="font-semibold text-foreground">{contentMap.coveragePercentage}%</span>
                  </div>
                  <Progress value={contentMap.coveragePercentage} className="h-2" />
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-muted-foreground block">Curriculum Depth:</span>
                  <span className="font-semibold capitalize text-foreground">{contentMap.estimatedDepth}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-muted-foreground block">Extracted Questions:</span>
                  <span className="font-semibold text-foreground">{detectedQuestions.length} Practice Items</span>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <Button asChild className="w-full text-xs gap-2">
                    <Link href={`/dashboard/exams/builder?material=${data.id}`}>
                      <Sparkles className="h-3.5 w-3.5" /> Start Test Now
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Topic & Subtopic Hierarchy */}
        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Extracted Topic Hierarchy
              </CardTitle>
              <CardDescription>
                Curriculum syllabus breakdown extracted page-by-page with evidence citations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topicsHierarchy.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No topic hierarchy extracted yet. Click &quot;Run AI Intelligence&quot; to synthesize curriculum topics.
                </div>
              ) : (
                <div className="space-y-4">
                  {topicsHierarchy.map((topic, i) => (
                    <div
                      key={topic.id}
                      className="p-4 rounded-xl border border-border bg-card/60 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary font-mono text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-foreground">{topic.title}</h4>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          Pages {topic.pageReferences.join(", ")}
                        </Badge>
                      </div>

                      {topic.subtopics.length > 0 && (
                        <div className="pl-8 space-y-2 border-l border-border/80 ml-3">
                          {topic.subtopics.map((sub) => (
                            <div key={sub.id} className="text-xs space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-foreground">{sub.title}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  p. {sub.pageReferences.join(", ")}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-2 rounded-lg">
                                &quot;{sub.evidenceCitation}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Detected Questions */}
        <TabsContent value="questions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" /> Detected Examination Questions
                </CardTitle>
                <CardDescription>
                  Original questions, options, and solutions detected within the source material.
                </CardDescription>
              </div>
              <Badge variant="indigo">{detectedQuestions.length} Detected</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {detectedQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No questions detected yet. Run AI intelligence to scan the document for question banks.
                </div>
              ) : (
                <div className="space-y-4">
                  {detectedQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-border bg-card space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            Q{q.questionNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">· Page {q.pageNumber}</span>
                          {q.isComplete ? (
                            <Badge variant="success" className="text-[10px] py-0">Complete</Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px] py-0">
                              Incomplete: missing {q.missingElements.join(", ")}
                            </Badge>
                          )}
                        </div>

                        <Button
                          onClick={() => {
                            setFlagQuestion(q);
                            setIsFlagOpen(true);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                        >
                          <Flag className="h-3 w-3" /> Flag Mistake
                        </Button>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-foreground">{q.body}</p>

                      {q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt) => (
                            <div
                              key={opt.label}
                              className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                                q.answerKey === opt.label
                                  ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-semibold"
                                  : "border-border bg-muted/20 text-muted-foreground"
                              }`}
                            >
                              <span className="font-mono font-bold">{opt.label}.</span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.answerKey && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                          ✓ Solution Key: Option {q.answerKey}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Content Map & Gaps */}
        <TabsContent value="contentmap">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Content Map & Curriculum Gap Analysis</CardTitle>
              <CardDescription>
                Systematic evaluation of syllabus breadth, depth, and missing prerequisites.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block mb-1">Syllabus Coverage</span>
                  <span className="text-2xl font-bold font-mono text-primary">
                    {contentMap.coveragePercentage}%
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block mb-1">Curriculum Depth</span>
                  <span className="text-2xl font-bold font-mono capitalize text-foreground">
                    {contentMap.estimatedDepth}
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block mb-1">Total Core Topics</span>
                  <span className="text-2xl font-bold font-mono text-foreground">
                    {contentMap.totalTopics}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Identified Curriculum Gaps
                </h4>
                {contentMap.identifiedGaps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No significant syllabus gaps detected.</p>
                ) : (
                  <div className="space-y-2">
                    {contentMap.identifiedGaps.map((gap, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border bg-card/60 text-xs flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>{gap}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recommended Prerequisites
                </h4>
                <div className="flex flex-wrap gap-2">
                  {contentMap.recommendedPrerequisites.map((prereq, i) => (
                    <Badge key={i} variant="outline" className="text-xs py-1">
                      {prereq}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Per-Page Text Preview */}
        <TabsContent value="preview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Extracted Text Preview</CardTitle>
                <CardDescription>
                  Verified plain-text segments extracted page-by-page. Content is sanitized and isolated.
                </CardDescription>
              </div>

              {/* Page Navigator */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={selectedPage <= 1}
                  onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono font-medium">
                  Page {selectedPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={selectedPage >= totalPages}
                  onClick={() => setSelectedPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Page {currentPageData.pageNumber}</span>
                  <span>·</span>
                  <span>{currentPageData.wordCount} words</span>
                  {currentPageData.hasLowText && (
                    <Badge variant="warning" className="text-[10px] py-0">Low Text Density</Badge>
                  )}
                </div>
                <Button
                  onClick={handleCopyText}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                >
                  {copiedPage ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedPage ? "Copied" : "Copy Page"}
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {currentPageData.extractedText || "No text extracted on this page."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: PDF Document Viewer */}
        <TabsContent value="viewer">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Original PDF Viewer</CardTitle>
              <CardDescription>
                Secure, authenticated document preview served via time-limited signed token.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {signedPreviewUrl ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Secure link expires in 60 minutes.</span>
                    <Button asChild variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                      <a href={signedPreviewUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
                      </a>
                    </Button>
                  </div>
                  <iframe
                    src={signedPreviewUrl}
                    className="w-full h-[600px] rounded-xl border border-border bg-slate-900"
                    title={data.title}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-xl">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-semibold text-foreground">Secure PDF Stream</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                    Generate an authenticated signed URL to preview the original PDF document.
                  </p>
                  <Button onClick={handleFetchPreview} size="sm" className="gap-1.5">
                    <Eye className="h-4 w-4" /> Load Secure Viewer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Inferred Metadata Modal */}
      <Dialog open={isEditMetadataOpen} onOpenChange={setIsEditMetadataOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct Inferred Curriculum Metadata</DialogTitle>
            <DialogDescription>
              Update the inferred subject, target examination board, or educational level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Subject</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Target Exam Board</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                value={editExam}
                onChange={(e) => setEditExam(e.target.value)}
              >
                <option value="JAMB_UTME">JAMB UTME</option>
                <option value="WAEC_WASSCE">WAEC WASSCE</option>
                <option value="NECO_SSCE">NECO SSCE</option>
                <option value="ICAN">ICAN</option>
                <option value="GENERAL_ACADEMIC">General Academic</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Educational Level</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                value={editLevel}
                onChange={(e) => setEditLevel(e.target.value)}
              >
                <option value="senior_secondary">Senior Secondary</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="professional">Professional</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditMetadataOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMetadata}>Save Corrections</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Extraction Mistake Modal */}
      <Dialog open={isFlagOpen} onOpenChange={setIsFlagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Extraction Mistake</DialogTitle>
            <DialogDescription>
              Report an issue with Question {flagQuestion?.questionNumber} on Page {flagQuestion?.pageNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="p-3 bg-muted/40 rounded-lg font-mono text-[11px] truncate">
              {flagQuestion?.body}
            </p>
            <textarea
              className="w-full p-2.5 border rounded-lg bg-background text-foreground text-xs min-h-[90px]"
              placeholder="Describe the issue (e.g. Incorrect answer key detected, missing option D, question truncated)..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFlagOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFlagSubmit} disabled={!flagReason.trim()}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Study Material</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{data.filename}&quot;? This will permanently remove the uploaded PDF and all extracted page records from your account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
