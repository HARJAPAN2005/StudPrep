"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LayoutDashboard,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExamAttemptReviewResult } from "@/app/actions/exam-engine";

interface ResultsClientProps {
  initialResult: ExamAttemptReviewResult;
}

export function ResultsClient({ initialResult }: ResultsClientProps) {
  const {
    title,
    score,
    marksObtained,
    maxMarks,
    correctCount,
    incorrectCount,
    unansweredCount,
    timeSpentSeconds,
    questions,
  } = initialResult;

  const totalQuestions = questions.length;
  const avgSecondsPerQ = totalQuestions > 0 ? Math.round(timeSpentSeconds / totalQuestions) : 0;

  const formatSeconds = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs}s`;
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
        {/* ── Top Header & Summary ────────────────────────────────────────── */}
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="indigo" className="gap-1.5 font-mono text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> Examination Authenticated & Scored
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Performance Report: {title}
            </h1>
            <p className="text-xs text-slate-400">
              Session evaluated using server-authoritative marking scheme.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-slate-800 text-slate-200 hover:bg-slate-900 gap-1.5"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
            >
              <Link href="/dashboard/exams/builder">
                <RotateCcw className="h-4 w-4" /> New Exam
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Score Gauge Card ──────────────────────────────────────────────── */}
        <div className="p-8 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative flex items-center justify-center">
              {/* Circular Gauge Graphic */}
              <div className="h-32 w-32 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center bg-slate-900/80 shadow-inner">
                <span className="text-3xl font-extrabold text-white font-mono">{score}%</span>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Score</span>
              </div>
            </div>

            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="text-lg font-bold text-white">
                  {score >= 70 ? "Excellent Work!" : score >= 50 ? "Satisfactory Pass" : "Needs Further Practice"}
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Marks Earned: <span className="text-emerald-400 font-bold font-mono">{marksObtained}</span> / {maxMarks} maximum marks.
              </p>
              <p className="text-xs text-slate-400">
                Breakdown: <strong className="text-emerald-400">{correctCount} correct</strong>,{" "}
                <strong className="text-rose-400">{incorrectCount} incorrect</strong>,{" "}
                <strong className="text-slate-400">{unansweredCount} unanswered</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto text-xs">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-slate-400 block mb-1">Time Expended</span>
              <span className="text-base font-bold text-white font-mono">
                {formatSeconds(timeSpentSeconds)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-slate-400 block mb-1">Pacing</span>
              <span className="text-base font-bold text-white font-mono">
                {avgSecondsPerQ}s / MCQ
              </span>
            </div>
          </div>
        </div>

        {/* ── Question-by-Question Review with Worked Explanations ───────────── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" /> Comprehensive Solution Review
          </h2>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const isCorrect = q.isCorrect;
              const isUnanswered = !q.selectedOptionId;

              return (
                <div
                  key={q.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    isCorrect
                      ? "border-emerald-500/30 bg-emerald-950/10"
                      : isUnanswered
                      ? "border-slate-800 bg-slate-900/40"
                      : "border-rose-500/30 bg-rose-950/10"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        Question {idx + 1}
                      </span>
                      {isCorrect ? (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Correct (+{q.marks}m)
                        </Badge>
                      ) : isUnanswered ? (
                        <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                          Unanswered (0m)
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <XCircle className="h-3 w-3" /> Incorrect (-{q.negativeMarks}m)
                        </Badge>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Page {q.sourceReference.pageNumber || 1}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-100 leading-relaxed mb-4">
                    {q.body}
                  </p>

                  {/* Options review */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
                    {q.options.map((opt) => {
                      const isOptionCorrect = opt.id === q.correctOptionId;
                      const isOptionSelected = opt.id === q.selectedOptionId;

                      let optClass = "border-slate-800 bg-slate-900/60 text-slate-400";
                      if (isOptionCorrect) {
                        optClass = "border-emerald-500 bg-emerald-950/40 text-emerald-200 font-semibold ring-1 ring-emerald-500/30";
                      } else if (isOptionSelected) {
                        optClass = "border-rose-500 bg-rose-950/40 text-rose-200 line-through ring-1 ring-rose-500/30";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border flex items-start gap-2.5 ${optClass}`}
                        >
                          <span className="font-bold font-mono">{opt.label}.</span>
                          <span className="flex-1 leading-snug">{opt.text}</span>
                          {isOptionCorrect && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          {isOptionSelected && !isOptionCorrect && (
                            <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Worked solution */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Worked Solution & Explanation:
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
