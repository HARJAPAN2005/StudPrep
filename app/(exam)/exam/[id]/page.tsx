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
  RotateCcw,
  X,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MOCK_EXAM_SESSION, CBTQuestion } from "@/lib/fixtures/mock-data";

export default function ExamRunnerPage() {
  const router = useRouter();
  const session = MOCK_EXAM_SESSION;
  const questions: CBTQuestion[] = session.questions;

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [flagged, setFlagged] = React.useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = React.useState(session.timeLimitMinutes * 60);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const unAnsweredCount = totalCount - answeredCount;

  // Countdown timer
  React.useEffect(() => {
    if (timeRemaining <= 0) {
      // Auto-submit when time expires
      router.push(`/exam/${session.id}/results`);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, router, session.id]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }));
  };

  const toggleFlag = () => {
    setFlagged((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const clearAnswer = () => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  const confirmSubmission = () => {
    setIsSubmitModalOpen(false);
    // Navigate to results screen (in real mode this would trigger server scoring)
    router.push(`/exam/${session.id}/results`);
  };

  const isLowTime = timeRemaining < 300; // < 5 minutes remaining

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* ── Top Bar: Exam Title, Live Countdown Timer, Submit Action ────────── */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white truncate max-w-[200px] sm:max-w-md">
              {session.title}
            </h1>
            <p className="text-[11px] text-slate-400">
              Question {currentIndex + 1} of {totalCount} · {session.subject}
            </p>
          </div>
        </div>

        {/* Center: Live Timer */}
        <div
          role="timer"
          aria-live="polite"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border font-mono text-sm font-bold transition-colors ${
            isLowTime
              ? "border-red-500/50 bg-red-500/10 text-red-400 animate-pulse"
              : "border-slate-700 bg-slate-800 text-slate-200"
          }`}
        >
          <Clock className={`h-4 w-4 ${isLowTime ? "text-red-400" : "text-slate-400"}`} />
          <span>{formatTimer(timeRemaining)}</span>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="md:hidden p-2 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
          >
            Palette
          </button>
          <Button
            onClick={() => setIsSubmitModalOpen(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Submit Examination</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        </div>
      </header>

      {/* ── Main Body: Question Workstation + Side Navigator Palette ────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Question Display */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 flex flex-col justify-between max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            {/* Meta Tags */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Question {currentQ.number}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Topic: {currentQ.topic}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleFlag}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                  flagged[currentQ.id]
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
                aria-pressed={!!flagged[currentQ.id]}
              >
                <Flag className="h-3.5 w-3.5" />
                <span>{flagged[currentQ.id] ? "Flagged for Review" : "Flag Question"}</span>
              </button>
            </div>

            {/* Question Body */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
              <p className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed">
                {currentQ.question}
              </p>
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2" role="radiogroup" aria-label={`Options for Question ${currentQ.number}`}>
              {currentQ.options.map((opt, i) => {
                const isSelected = answers[currentQ.id] === opt.id;
                const letter = String.fromCharCode(65 + i); // A, B, C, D
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") handleSelectOption(opt.id);
                    }}
                    className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-600/10 ring-2 ring-indigo-500/40"
                        : "border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-700 bg-slate-800 text-slate-400"
                      }`}
                    >
                      {letter}
                    </div>
                    <span className="text-sm sm:text-base text-slate-200 flex-1 leading-snug">
                      {opt.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions: Clear, Previous, Next */}
          <div className="pt-8 border-t border-slate-800 flex items-center justify-between gap-4 mt-8">
            <button
              type="button"
              onClick={clearAnswer}
              disabled={!answers[currentQ.id]}
              className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear choice
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="border-slate-800 text-slate-200 hover:bg-slate-800 gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                disabled={currentIndex === totalCount - 1}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </main>

        {/* ── Right Side Question Palette (Desktop & Mobile Drawer) ────────── */}
        <aside
          className={`w-72 border-l border-slate-800 bg-slate-900/80 p-6 flex flex-col shrink-0 ${
            isPaletteOpen
              ? "fixed inset-y-0 right-0 z-50 flex shadow-2xl"
              : "hidden md:flex"
          }`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-white">Question Navigator</h3>
              <p className="text-xs text-slate-400">
                {answeredCount} of {totalCount} Answered
              </p>
            </div>
            {isPaletteOpen && (
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
                aria-label="Close question palette"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Palette Legend */}
          <div className="py-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Answered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700"></span> Unanswered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Flagged
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-indigo-400 bg-indigo-500/20"></span> Current
            </span>
          </div>

          {/* Question Grid Numbers */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!answers[q.id];
                const isFlag = !!flagged[q.id];

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsPaletteOpen(false);
                    }}
                    className={`h-10 rounded-lg text-xs font-bold transition-all relative ${
                      isCurrent
                        ? "border-2 border-indigo-500 bg-indigo-600/30 text-white shadow-md"
                        : isAnswered
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    aria-label={`Jump to question ${idx + 1}`}
                  >
                    {idx + 1}
                    {isFlag && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Palette Action */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Submit Exam ({answeredCount}/{totalCount})
            </Button>
          </div>
        </aside>
      </div>

      {/* ── Submit Confirmation Dialog ────────────────────────────────────── */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Confirm Examination Submission
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Are you sure you want to conclude this session? You will not be able to revise your selections once submitted.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 grid grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <span className="text-slate-400">Answered:</span>
                <p className="text-emerald-400 font-bold text-sm">{answeredCount} questions</p>
              </div>
              <div>
                <span className="text-slate-400">Unanswered:</span>
                <p className={`font-bold text-sm ${unAnsweredCount > 0 ? "text-amber-400" : "text-slate-300"}`}>
                  {unAnsweredCount} questions
                </p>
              </div>
            </div>

            {unAnsweredCount > 0 && (
              <p className="text-xs text-amber-400/90 leading-relaxed">
                Notice: You have {unAnsweredCount} unanswered questions remaining. Unanswered items receive zero points.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsSubmitModalOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Keep Answering
            </Button>
            <Button
              onClick={confirmSubmission}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Yes, Finalize & Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
