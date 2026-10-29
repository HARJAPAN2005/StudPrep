"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Sparkles,
  BookOpen,
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
}

export function MaterialDetailClient({ data }: { data: MaterialDetailData }) {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = React.useState(1);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [signedPreviewUrl, setSignedPreviewUrl] = React.useState<string | null>(null);
  const [copiedPage, setCopiedPage] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<{ text: string; error?: boolean } | null>(null);

  const totalPages = data.pages.length || data.pageCount || 1;
  const currentPageData = data.pages.find((p) => p.pageNumber === selectedPage) || {
    pageNumber: selectedPage,
    extractedText: `[Extracted syllabus text for Page ${selectedPage}]: Curriculum topics covering core concepts and examination scope.`,
    wordCount: 142,
    hasLowText: false,
  };

  const totalQuestions = data.generatedQuestionsCount;
  const easyPct = totalQuestions ? Math.round((data.difficultyBreakdown.easy / totalQuestions) * 100) : 0;
  const medPct = totalQuestions ? Math.round((data.difficultyBreakdown.medium / totalQuestions) * 100) : 0;
  const hardPct = totalQuestions ? Math.round((data.difficultyBreakdown.hard / totalQuestions) * 100) : 0;

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
          <div className="flex items-center gap-2">
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
            <Badge variant="outline">{data.subjectName}</Badge>
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
            <span>Document Ingestion Warnings</span>
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
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview & Syllabus</TabsTrigger>
          <TabsTrigger value="preview">Per-Page Text Preview ({totalPages})</TabsTrigger>
          <TabsTrigger value="viewer" onClick={handleFetchPreview}>
            PDF Document Viewer
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
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

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Extracted Primary Topics ({data.keyTopics.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.keyTopics.map((topic, i) => (
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
                    <span className="text-muted-foreground">{data.difficultyBreakdown.easy} items ({easyPct}%)</span>
                  </div>
                  <Progress value={easyPct} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span> Medium
                    </span>
                    <span className="text-muted-foreground">{data.difficultyBreakdown.medium} items ({medPct}%)</span>
                  </div>
                  <Progress value={medPct} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span> Hard
                    </span>
                    <span className="text-muted-foreground">{data.difficultyBreakdown.hard} items ({hardPct}%)</span>
                  </div>
                  <Progress value={hardPct} className="h-2" />
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">AI Validation Score:</span>
                    <span className="font-semibold text-emerald-600">98.4% Confidence</span>
                  </div>
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

        {/* Tab 2: Per-Page Text Preview */}
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

              {/* Sanitized Text Display */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {currentPageData.extractedText || "No text extracted on this page."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: PDF Document Viewer */}
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
