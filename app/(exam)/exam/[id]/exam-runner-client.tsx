"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Play,
  Save,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { SanitizedQuestion } from "@/lib/schemas/exam-studio";
import {
  autosaveAnswerAction,
  toggleReviewFlagAction,
  markQuestionVisitedAction,
  submitExamAttemptAction,
  type ActiveAttemptState,
} from "@/app/actions/exam-engine";
import { logIntegrityEventAction } from "@/app/actions/integrity";

interface ExamRunnerClientProps {
  initialState: ActiveAttemptState;
}

export function ExamRunnerClient({ initialState }: ExamRunnerClientProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>(initialState.answers);
  const [reviewFlags, setReviewFlags] = React.useState<Record<string, boolean>>(initialState.reviewFlags);
  const [visited, setVisited] = React.useState<Record<string, boolean>>(initialState.visitedQuestions);
  const [timeRemaining, setTimeRemaining] = React.useState(initialState.timeRemainingSeconds);
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "offline">("saved");

  // Instructions & Confirmation Modals
  const [isInstructionsOpen, setIsInstructionsOpen] = React.useState(initialState.status === "not_started");
  const [integrityAcknowledged, setIntegrityAcknowledged] = React.useState(initialState.status !== "not_started");
  const [integrityToast, setIntegrityToast] = React.useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const questions: SanitizedQuestion[] = initialState.questions;
  const currentQ = questions[currentIndex];

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = Object.values(reviewFlags).filter(Boolean).length;

  // Fullscreen toggle handler with graceful fallback
  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    } catch {
      // Graceful fallback if browser permissions block fullscreen
    }
  };

  const jumpToQuestion = React.useCallback(
    (idx: number) => {
      setCurrentIndex(idx);
      const targetQ = questions[idx];
      if (targetQ && !visited[targetQ.id]) {
        setVisited((prev) => ({ ...prev, [targetQ.id]: true }));
        markQuestionVisitedAction(initialState.attemptId, targetQ.id).catch(() => {});
      }
    },
    [questions, visited, initialState.attemptId]
  );

  // Countdown Timer & Automatic Timeout Finalization
  React.useEffect(() => {
    if (initialState.isFinalized) {
      router.push(`/exam/${initialState.attemptId}/results`);
      return;
    }

    if (timeRemaining <= 0) {
      // Auto-submit when time expires
      submitExamAttemptAction(initialState.attemptId)
        .then(() => router.push(`/exam/${initialState.attemptId}/results`))
        .catch(() => router.push(`/exam/${initialState.attemptId}/results`));
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExamAttemptAction(initialState.attemptId).finally(() =>
            router.push(`/exam/${initialState.attemptId}/results`)
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, initialState.attemptId, initialState.isFinalized, router]);

  // Debounced Autosave Effect
  const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const saveAnswerToServer = React.useCallback(
    (questionId: string, optionId: string | null) => {
      setSaveStatus("saving");
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(async () => {
        try {
          const res = await autosaveAnswerAction(initialState.attemptId, questionId, optionId);
          if (res.isExpired) {
            router.push(`/exam/${initialState.attemptId}/results`);
          } else if (res.success) {
            setSaveStatus("saved");
          } else {
            setSaveStatus("offline");
          }
        } catch {
          setSaveStatus("offline");
        }
      }, 500);
    },
    [initialState.attemptId, router]
  );

  const handleSelectOption = React.useCallback(
    (optionId: string) => {
      if (!currentQ) return;
      const newAnswers = { ...answers, [currentQ.id]: optionId };
      setAnswers(newAnswers);
      saveAnswerToServer(currentQ.id, optionId);
    },
    [currentQ, answers, saveAnswerToServer]
  );

  const handleClearAnswer = () => {
    if (!currentQ) return;
    const copy = { ...answers };
    delete copy[currentQ.id];
    setAnswers(copy);
    saveAnswerToServer(currentQ.id, null);
  };

  const handleToggleFlag = async () => {
    if (!currentQ) return;
    const nextVal = !reviewFlags[currentQ.id];
    setReviewFlags((prev) => ({ ...prev, [currentQ.id]: nextVal }));
    await toggleReviewFlagAction(initialState.attemptId, currentQ.id, nextVal);
  };

  // Keyboard navigation and option selection
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside an input or modal is open
      if (isSubmitModalOpen || isInstructionsOpen) return;

      const key = e.key.toUpperCase();
      if (!currentQ) return;

      // Number keys 1-4 or letters A-D
      const optMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, A: 0, B: 1, C: 2, D: 3 };
      if (key in optMap) {
        const idx = optMap[key];
        if (currentQ.options[idx]) {
          handleSelectOption(currentQ.options[idx].id);
        }
      } else if (e.key === "ArrowRight") {
        if (currentIndex < questions.length - 1) jumpToQuestion(currentIndex + 1);
      } else if (e.key === "ArrowLeft") {
        if (currentIndex > 0) jumpToQuestion(currentIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentQ, questions.length, isSubmitModalOpen, isInstructionsOpen, handleSelectOption, jumpToQuestion]);

  // Examination Integrity Telemetry (focus loss, visibility change, fullscreen transitions)
  React.useEffect(() => {
    if (isInstructionsOpen || initialState.isFinalized) return;

    const logSignal = (
      eventType:
        | "fullscreen_entry"
        | "fullscreen_exit"
        | "visibility_hidden"
        | "visibility_visible"
        | "window_blur"
        | "window_focus"
    ) => {
      logIntegrityEventAction({
        attemptId: initialState.attemptId,
        eventType,
        metadata: { currentQuestionIndex: currentIndex },
        clientTimestamp: new Date().toISOString(),
      })
        .then((res) => {
          if (res.success && res.warningCount && res.warningCount > 0) {
            if (["fullscreen_exit", "visibility_hidden", "window_blur"].includes(eventType)) {
              setIntegrityToast(
                `Browser focus change recorded (${res.warningCount} events logged). Please stay focused on your exam.`
              );
            }
          }
        })
        .catch(() => {});
    };

    const handleVisibility = () => {
      if (document.hidden) {
        logSignal("visibility_hidden");
      } else {
        logSignal("visibility_visible");
      }
    };

    const handleBlur = () => logSignal("window_blur");
    const handleFocus = () => logSignal("window_focus");

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
        logSignal("fullscreen_entry");
      } else {
        setIsFullscreen(false);
        logSignal("fullscreen_exit");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isInstructionsOpen, initialState.attemptId, initialState.isFinalized, currentIndex]);

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitExamAttemptAction(initialState.attemptId);
      router.push(`/exam/${initialState.attemptId}/results`);
    } catch {
      router.push(`/exam/${initialState.attemptId}/results`);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(Math.max(0, totalSecs) / 60);
    const secs = Math.max(0, totalSecs) % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeRemaining < 300; // < 5 minutes

  if (!currentQ) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white p-8">
        No questions loaded in this exam session.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* ── Top Bar: Exam Title, Live Countdown, Fullscreen & Submit CTA ───── */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            CBT
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-md">
              {initialState.title}
            </h1>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              <span>
                Q{currentIndex + 1} of {totalQuestions}
              </span>
              <span>• {currentQ.marks} marks</span>
              {initialState.negativeMarking > 0 && (
                <span className="text-amber-400 font-mono">
                  (-{initialState.negativeMarking} wrong)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-bold transition-all ${
              isLowTime
                ? "bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse"
                : "bg-slate-800/80 text-slate-100 border border-slate-700"
            }`}
          >
            <Clock className={`h-4 w-4 ${isLowTime ? "text-rose-400" : "text-indigo-400"}`} />
            <span>{formatTimer(timeRemaining)}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPaletteOpen((prev) => !prev)}
            className="text-slate-400 hover:text-white lg:hidden"
            aria-label="Toggle Question Palette"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-slate-400 hover:text-white hidden sm:flex"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <Button
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm gap-1.5"
          >
            <Send className="h-3.5 w-3.5" /> Submit Exam
          </Button>
        </div>
      </header>

      {/* ── Non-Punitive Integrity Notice Toast ─────────────────────────────── */}
      {integrityToast && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{integrityToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setIntegrityToast(null)}
            className="text-[10px] text-amber-400 hover:text-amber-200 underline ml-4"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* ── Main Testing Workstation ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Question Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 flex flex-col justify-between max-w-4xl mx-auto w-full">
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Question Header & Review Toggle */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-slate-800 text-xs font-mono font-bold text-slate-300">
                  Question {currentIndex + 1}
                </span>
                <Badge variant="outline" className="border-slate-800 text-slate-400 text-[10px]">
                  {currentQ.difficulty.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFlag}
                  className={`gap-1.5 text-xs transition-colors ${
                    reviewFlags[currentQ.id]
                      ? "border-amber-500 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                      : "border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" />
                  {reviewFlags[currentQ.id] ? "Flagged for Review" : "Mark for Review"}
                </Button>

                {answers[currentQ.id] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAnswer}
                    className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
                  >
                    Clear Response
                  </Button>
                )}
              </div>
            </div>

            {/* Question Stem */}
            <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed font-sans">
              {currentQ.body}
            </div>

            {/* Option Radio Cards */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = answers[currentQ.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-4 transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/40 text-white ring-2 ring-indigo-500/30 shadow-md"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {opt.label || String.fromCharCode(65 + oIdx)}
                    </div>
                    <span className="text-sm font-medium leading-relaxed pt-0.5">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar: Prev / Next & Autosave Indicator */}
          <footer className="pt-8 border-t border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => jumpToQuestion(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="border-slate-800 text-slate-300 hover:bg-slate-900 gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              <Button
                size="sm"
                onClick={() => jumpToQuestion(Math.min(questions.length - 1, currentIndex + 1))}
                disabled={currentIndex === questions.length - 1}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Autosave Status Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              {saveStatus === "saving" ? (
                <>
                  <Save className="h-3 w-3 animate-spin text-indigo-400" />
                  <span>Saving answer...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>All answers saved</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  <span>Saved locally (Syncing)</span>
                </>
              )}
            </div>
          </footer>
        </main>

        {/* Right Sidebar: Question Navigator Palette */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/60 backdrop-blur p-6 flex flex-col justify-between hidden lg:flex shrink-0">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Question Palette
              </span>
              <span className="text-xs font-mono text-slate-300 font-bold">
                {answeredCount} / {totalQuestions} Answered
              </span>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Answered ({answeredCount})
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-700" /> Unanswered (
                {unansweredCount})
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Review ({flaggedCount})
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Current
              </div>
            </div>

            {/* Palette Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!answers[q.id];
                const isFlagged = !!reviewFlags[q.id];
                const isVisited = !!visited[q.id];

                let bgClass = "bg-slate-900 border-slate-800 text-slate-500";
                if (isCurrent) {
                  bgClass = "bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/40 font-bold";
                } else if (isFlagged) {
                  bgClass = "bg-amber-500/20 border-amber-500 text-amber-300 font-bold";
                } else if (isAnswered) {
                  bgClass = "bg-emerald-600 border-emerald-500 text-white font-semibold";
                } else if (isVisited) {
                  bgClass = "bg-slate-800 border-slate-700 text-slate-300";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => jumpToQuestion(idx)}
                    className={`h-9 rounded-lg border text-xs flex items-center justify-center transition-all ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow"
            >
              Finish Examination
            </Button>
          </div>
        </aside>
      </div>

      {/* ── Pre-Exam Instructions Modal ────────────────────────────────────── */}
      <Dialog open={isInstructionsOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" /> CBT Examination Rules & Instructions
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Please read through the testing policies before starting your authenticated examination.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
              <div className="text-white font-bold">{initialState.title}</div>
              <div className="flex flex-wrap gap-4 text-slate-400 text-[11px]">
                <span>• Questions: {totalQuestions}</span>
                <span>• Duration: {Math.floor(initialState.timeRemainingSeconds / 60)} Mins</span>
                <span>• Total Marks: {initialState.totalMarks}</span>
                {initialState.negativeMarking > 0 && (
                  <span className="text-amber-400">
                    • Negative Marking: -{initialState.negativeMarking} per incorrect answer
                  </span>
                )}
              </div>
            </div>

            <ul className="space-y-2 list-disc list-inside text-[11px] leading-relaxed text-slate-400">
              <li>The examination timer runs continuously on the server once confirmed.</li>
              <li>Your answers are automatically saved securely after each selection.</li>
              <li>You may navigate back and forth between questions or mark items for review.</li>
              <li>
                When the timer expires, your exam will be automatically finalized and submitted.
              </li>
              <li>
                You can use numeric keys (1-4) or letters (A-D) to select answers via your keyboard.
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={integrityAcknowledged}
                  onChange={(e) => setIntegrityAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-300">
                  I understand that browser focus, window visibility, and fullscreen state are logged during this examination session to maintain integrity. No camera, audio, or invasive device recording is used.
                </span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsInstructionsOpen(false)}
              disabled={!integrityAcknowledged}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow gap-2 disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" /> I Understand & Begin Examination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Confirmation Dialog with Unanswered Summary ─────────────── */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" /> Confirm Exam Submission
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Review your attempt status before finalizing. Once submitted, answers cannot be altered.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Answered</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {answeredCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Unanswered</span>
                <span className="text-lg font-bold text-rose-400 font-mono">
                  {unansweredCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Flagged</span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  {flaggedCount}
                </span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  You have {unansweredCount} unanswered questions remaining. Are you sure you wish
                  to submit?
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
              className="border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              Return to Test
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isSubmitting ? "Submitting..." : "Yes, Finalize Submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mobile Question Palette Dialog ──────────────────────────────────── */}
      <Dialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {answeredCount} / {totalQuestions} Answered
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto py-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = !!answers[q.id];
              const isFlagged = !!reviewFlags[q.id];
              const isVisited = !!visited[q.id];

              let bgClass = "bg-slate-900 border-slate-800 text-slate-500";
              if (isCurrent) {
                bgClass = "bg-indigo-600 border-indigo-400 text-white font-bold ring-2 ring-indigo-400/40";
              } else if (isFlagged) {
                bgClass = "bg-amber-500/20 border-amber-500 text-amber-300 font-bold";
              } else if (isAnswered) {
                bgClass = "bg-emerald-600 border-emerald-500 text-white font-semibold";
              } else if (isVisited) {
                bgClass = "bg-slate-800 border-slate-700 text-slate-300";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    jumpToQuestion(idx);
                    setIsPaletteOpen(false);
                  }}
                  className={`h-9 rounded-lg border text-xs flex items-center justify-center transition-all ${bgClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
