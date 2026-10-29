"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Play,
  Sliders,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  ExamMode,
  ExamConfiguration,
  StudioQuestion,
  QuestionDifficulty,
} from "@/lib/schemas/exam-studio";
import {
  generateDraftQuestionsAction,
  regenerateSingleQuestionAction,
  publishExamSnapshotAction,
  launchExamAttemptAction,
  validateExamSettingsAction,
} from "@/app/actions/exam-studio";

export interface StudioMaterialItem {
  id: string;
  title: string;
  filename: string;
  hasAnalysis: boolean;
  detectedQuestionsCount: number;
}

export interface StudioSubjectItem {
  id: string;
  name: string;
  code: string;
}

interface ExamStudioClientProps {
  initialSubjects: StudioSubjectItem[];
  initialMaterials: StudioMaterialItem[];
}

export function ExamStudioClient({ initialSubjects, initialMaterials }: ExamStudioClientProps) {
  const router = useRouter();

  // Mode Selection
  const [mode, setMode] = React.useState<ExamMode>("generate_practice");
  const [selectedSubjectId, setSelectedSubjectId] = React.useState(
    initialSubjects[0]?.id || "11111111-1111-1111-1111-111111111111"
  );
  const [selectedMaterialIds, setSelectedMaterialIds] = React.useState<string[]>(
    initialMaterials.length > 0 ? [initialMaterials[0].id] : []
  );

  // Configuration parameters
  const [title, setTitle] = React.useState("JAMB & WAEC CBT Practice Mock 2026");
  const [questionCount, setQuestionCount] = React.useState(10);
  const [durationMinutes, setDurationMinutes] = React.useState(20);
  const [easyPercent, setEasyPercent] = React.useState(30);
  const [mediumPercent, setMediumPercent] = React.useState(50);
  const [hardPercent, setHardPercent] = React.useState(20);
  const [marksPerQuestion, setMarksPerQuestion] = React.useState(1.0);
  const [negativeMarking, setNegativeMarking] = React.useState(0.0);
  const [shuffleQuestions, setShuffleQuestions] = React.useState(true);
  const [shuffleOptions, setShuffleOptions] = React.useState(true);

  // Studio Questions state
  const [questions, setQuestions] = React.useState<StudioQuestion[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = React.useState<number | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = React.useState<string[]>([]);

  // Question Edit Modal State
  const [editingQuestion, setEditingQuestion] = React.useState<StudioQuestion | null>(null);
  const [editBody, setEditBody] = React.useState("");
  const [editExplanation, setEditExplanation] = React.useState("");
  const [editCorrectOptId, setEditCorrectOptId] = React.useState("");
  const [editDifficulty, setEditDifficulty] = React.useState<QuestionDifficulty>("medium");

  const buildCurrentConfig = React.useCallback((): ExamConfiguration => ({
    title,
    subjectId: selectedSubjectId,
    mode,
    materialIds: selectedMaterialIds,
    topicIds: [],
    questionCount,
    durationMinutes,
    difficultyDistribution: { easy: easyPercent, medium: mediumPercent, hard: hardPercent },
    marksPerQuestion,
    negativeMarking,
    shuffleQuestions,
    shuffleOptions,
    feedbackTiming: "after_submission",
    sections: [],
  }), [
    title,
    selectedSubjectId,
    mode,
    selectedMaterialIds,
    questionCount,
    durationMinutes,
    easyPercent,
    mediumPercent,
    hardPercent,
    marksPerQuestion,
    negativeMarking,
    shuffleQuestions,
    shuffleOptions,
  ]);

  // Toggle material selection
  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Validate settings against available material questions
  React.useEffect(() => {
    async function validate() {
      const config = buildCurrentConfig();
      const res = await validateExamSettingsAction(config);
      if (res && res.warnings) {
        setValidationWarnings(res.warnings);
      }
    }
    validate();
  }, [buildCurrentConfig]);

  // Generate Draft Questions
  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setActionError(null);
    try {
      const config = buildCurrentConfig();
      const res = await generateDraftQuestionsAction(config);
      if (res.success && res.questions) {
        setQuestions(res.questions);
        if (res.warnings) setValidationWarnings(res.warnings);
      } else {
        setActionError(res.error || "Failed to generate exam draft.");
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error generating questions.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate a single question
  const handleRegenerateSingle = async (index: number) => {
    setRegeneratingIndex(index);
    try {
      const config = buildCurrentConfig();
      const res = await regenerateSingleQuestionAction(config, index);
      if (res.success && res.question) {
        setQuestions((prev) => {
          const next = [...prev];
          next[index] = res.question!;
          return next;
        });
      } else {
        setActionError(res.error || "Failed to regenerate question.");
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error regenerating.");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Delete question
  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((q, i) => ({ ...q, orderIndex: i }));
    });
  };

  // Reorder questions (move up / down)
  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    setQuestions((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((q, i) => ({ ...q, orderIndex: i }));
    });
  };

  // Open Edit Dialog
  const handleOpenEdit = (q: StudioQuestion) => {
    setEditingQuestion(q);
    setEditBody(q.body);
    setEditExplanation(q.explanation);
    setEditCorrectOptId(q.correctOptionId);
    setEditDifficulty(q.difficulty);
  };

  // Save Question Edit
  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === editingQuestion.id) {
          return {
            ...q,
            body: editBody,
            explanation: editExplanation,
            correctOptionId: editCorrectOptId,
            difficulty: editDifficulty,
            reviewStatus: "edited",
            validationIssues: [],
          };
        }
        return q;
      })
    );
    setEditingQuestion(null);
  };

  // Publish Snapshot & Launch Active Attempt
  const handlePublishAndLaunch = async () => {
    setIsPublishing(true);
    setActionError(null);
    try {
      const config = buildCurrentConfig();
      const pubRes = await publishExamSnapshotAction(config, questions);
      if (!pubRes.success || !pubRes.snapshotId) {
        setActionError(pubRes.error || "Failed to publish exam snapshot.");
        setIsPublishing(false);
        return;
      }

      const launchRes = await launchExamAttemptAction(pubRes.snapshotId);
      if (launchRes.success && launchRes.attemptId) {
        router.push(`/exam/${launchRes.attemptId}`);
      } else {
        setActionError(launchRes.error || "Failed to launch exam attempt.");
        setIsPublishing(false);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error publishing exam.");
      setIsPublishing(false);
    }
  };

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="indigo" className="gap-1.5">
              <Sparkles className="h-3 w-3" /> Exam Studio & CBT Engine
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            CBT Examination Configuration Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure, generate, verify, and launch authentic timed computer-based examination sessions.
          </p>
        </div>

        {questions.length > 0 && (
          <Button
            size="lg"
            onClick={handlePublishAndLaunch}
            disabled={isPublishing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-md"
          >
            <Play className="h-4 w-4" />
            {isPublishing ? "Publishing Snapshot..." : `Start Exam (${questions.length} Qs)`}
          </Button>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {validationWarnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Configuration Notice
          </div>
          {validationWarnings.map((w, idx) => (
            <div key={idx}>• {w}</div>
          ))}
        </div>
      )}

      {/* ── 1. Mode Selection Cards ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Exam Creation Mode
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode 1: Recreate Source Paper */}
          <button
            type="button"
            onClick={() => setMode("recreate_source")}
            className={`text-left p-5 rounded-2xl border transition-all ${
              mode === "recreate_source"
                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/30 shadow-sm"
                : "border-border bg-card hover:border-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <Badge variant={mode === "recreate_source" ? "indigo" : "outline"} className="text-[10px]">
                Original Source
              </Badge>
            </div>
            <h3 className="text-base font-bold text-foreground">Recreate Source Paper</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Preserves verified questions extracted directly from past papers and official syllabus documents.
            </p>
          </button>

          {/* Mode 2: Generate Practice Exam */}
          <button
            type="button"
            onClick={() => setMode("generate_practice")}
            className={`text-left p-5 rounded-2xl border transition-all ${
              mode === "generate_practice"
                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/30 shadow-sm"
                : "border-border bg-card hover:border-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge variant={mode === "generate_practice" ? "indigo" : "outline"} className="text-[10px]">
                AI Grounded
              </Badge>
            </div>
            <h3 className="text-base font-bold text-foreground">Generate Practice Exam</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Synthesizes brand-new, unseen questions grounded strictly in reference notes and textbook evidence.
            </p>
          </button>

          {/* Mode 3: Mixed Exam */}
          <button
            type="button"
            onClick={() => setMode("mixed")}
            className={`text-left p-5 rounded-2xl border transition-all ${
              mode === "mixed"
                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/30 shadow-sm"
                : "border-border bg-card hover:border-slate-400 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <Badge variant={mode === "mixed" ? "indigo" : "outline"} className="text-[10px]">
                50/50 Hybrid
              </Badge>
            </div>
            <h3 className="text-base font-bold text-foreground">Mixed Exam</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Combines original past examination questions with fresh synthetic diagnostic items.
            </p>
          </button>
        </div>
      </div>

      {/* ── 2. Configuration Settings Grid ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" /> Exam Parameters
          </CardTitle>
          <CardDescription>
            Specify question counts, marking schemes, source grounding, and exam duration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Title */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="exam-title">Exam Title</Label>
              <Input
                id="exam-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UTME Physics Speed Mock"
              />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label>Target Subject</Label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                {initialSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Materials Multi-select */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reference Study Materials
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {initialMaterials.map((m) => {
                const isSelected = selectedMaterialIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMaterial(m.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left text-xs transition-colors ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-foreground font-medium"
                        : "border-border bg-card text-muted-foreground hover:border-slate-400"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded mt-0.5 flex items-center justify-center border ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-400 bg-transparent"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="truncate flex-1">
                      <div className="font-semibold text-foreground truncate">{m.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {m.hasAnalysis
                          ? `${m.detectedQuestionsCount} detected questions`
                          : "Raw document"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numerical Parameters: Count, Time, Marks, Negative Marking */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="q-count">Questions</Label>
              <Input
                id="q-count"
                type="number"
                min={5}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 10)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (mins)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 20)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="marks-per-q">Marks / Question</Label>
              <Input
                id="marks-per-q"
                type="number"
                step="0.5"
                min={0.5}
                max={10}
                value={marksPerQuestion}
                onChange={(e) => setMarksPerQuestion(parseFloat(e.target.value) || 1.0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="neg-marks">Negative Marking</Label>
              <select
                id="neg-marks"
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(parseFloat(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                <option value={0.0}>None (0.0 marks)</option>
                <option value={0.25}>-0.25 marks (-25%)</option>
                <option value={0.5}>-0.5 marks (-50%)</option>
                <option value={1.0}>-1.0 marks (-100%)</option>
              </select>
            </div>
          </div>

          {/* Difficulty Sliders */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground uppercase tracking-wider">
                Difficulty Distribution (Target: 100%)
              </span>
              <span className="text-foreground font-mono">
                {easyPercent}% Easy · {mediumPercent}% Medium · {hardPercent}% Hard
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 text-xs">
                <Label className="text-[11px]">Easy (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={easyPercent}
                  onChange={(e) => setEasyPercent(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-1 text-xs">
                <Label className="text-[11px]">Medium (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={mediumPercent}
                  onChange={(e) => setMediumPercent(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-1 text-xs">
                <Label className="text-[11px]">Hard (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={hardPercent}
                  onChange={(e) => setHardPercent(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Shuffle Rules */}
          <div className="flex flex-wrap items-center gap-6 pt-1 text-xs font-medium">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-600"
              />
              <span>Randomize Question Order per Attempt</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-600"
              />
              <span>Randomize MCQ Options (A, B, C, D)</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              onClick={handleGenerateDraft}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Synthesizing Exam Draft..." : "Generate Exam Draft"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Question Studio List & Editor ───────────────────────────────── */}
      {questions.length > 0 && (
        <div className="space-y-4">
          {/* Pre-Exam Summary Banner */}
          <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">
                Pre-Exam Snapshot Ready
              </div>
              <div className="text-lg font-bold">{title}</div>
              <div className="text-xs text-indigo-100 flex flex-wrap gap-4">
                <span>• {questions.length} Questions</span>
                <span>• {durationMinutes} Minutes</span>
                <span>• {totalCalculatedMarks} Total Marks</span>
                <span>
                  • Marking: +{marksPerQuestion} / -{negativeMarking} penalty
                </span>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handlePublishAndLaunch}
              disabled={isPublishing}
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold gap-2 shadow shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              {isPublishing ? "Starting..." : "Publish & Start Test"}
            </Button>
          </div>

          {/* Question Cards */}
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isFlagged = q.reviewStatus === "flagged_review";
              return (
                <Card
                  key={q.id}
                  className={`transition-all ${
                    isFlagged
                      ? "border-amber-400 bg-amber-50/20 dark:bg-amber-950/10"
                      : "border-border hover:border-slate-400 dark:hover:border-slate-700"
                  }`}
                >
                  <CardHeader className="py-3 px-5 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        Q{idx + 1}
                      </span>
                      <Badge
                        variant={
                          q.sourceReference.sourceType === "original_source" ? "outline" : "indigo"
                        }
                        className="text-[10px]"
                      >
                        {q.sourceReference.sourceType === "original_source"
                          ? `Source Paper (${q.sourceReference.originalQuestionNumber || "P" + q.sourceReference.pageNumber})`
                          : "AI Generated"}
                      </Badge>
                      <Badge
                        variant={
                          q.difficulty === "easy"
                            ? "success"
                            : q.difficulty === "hard"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {q.difficulty}
                      </Badge>
                      {isFlagged && (
                        <Badge variant="warning" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> Flagged for Review
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveQuestion(idx, "up")}
                        disabled={idx === 0}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Move question up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveQuestion(idx, "down")}
                        disabled={idx === questions.length - 1}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Move question down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRegenerateSingle(idx)}
                        disabled={regeneratingIndex === idx}
                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        aria-label="Regenerate question"
                      >
                        <RotateCcw
                          className={`h-3.5 w-3.5 ${regeneratingIndex === idx ? "animate-spin" : ""}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(q)}
                        className="h-8 w-8 text-slate-600 hover:text-foreground"
                        aria-label="Edit question"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        aria-label="Delete question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 pb-4 space-y-3">
                    <p className="text-sm font-medium text-foreground leading-relaxed">{q.body}</p>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt) => {
                        const isCorrect = opt.id === q.correctOptionId;
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-medium"
                                : "border-border bg-card text-muted-foreground"
                            }`}
                          >
                            <span className="font-bold text-xs">{opt.label}.</span>
                            <span className="flex-1">{opt.text}</span>
                            {isCorrect && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Worked Solution & Validation Issues */}
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Worked Solution & Rationale:
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>

                    {q.validationIssues.length > 0 && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                        {q.validationIssues.map((issue, iIdx) => (
                          <div key={iIdx}>• {issue}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Question Edit Modal ────────────────────────────────────────────── */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Modify question stem, answer key, or detailed worked explanation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Question Stem</Label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Correct Answer Option</Label>
              <select
                value={editCorrectOptId}
                onChange={(e) => setEditCorrectOptId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
              >
                {editingQuestion?.options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    Option {opt.label}: {opt.text}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Worked Solution / Explanation</Label>
              <textarea
                value={editExplanation}
                onChange={(e) => setEditExplanation(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-input bg-background text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <select
                value={editDifficulty}
                onChange={(e) => setEditDifficulty(e.target.value as QuestionDifficulty)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingQuestion(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} className="bg-indigo-600 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
