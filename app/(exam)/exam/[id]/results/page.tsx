"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LayoutDashboard,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_EXAM_SESSION } from "@/lib/fixtures/mock-data";

export default function ExamResultsPage() {
  const session = MOCK_EXAM_SESSION;
  const questions = session.questions;

  // Mock answers for results display demonstration
  const mockUserAnswers: Record<string, string> = {
    "q-1": "opt-a", // correct
    "q-2": "opt-b", // correct
    "q-3": "opt-a", // correct
    "q-4": "opt-b", // correct
    "q-5": "opt-d", // wrong (correct is opt-a)
  };

  const totalQuestions = questions.length;
  const correctCount = 4;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

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
              Performance Report: {session.title}
            </h1>
            <p className="text-xs text-slate-400">
              Concluded on October 29, 2026 · {session.subject}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="border-slate-800 text-slate-200 hover:bg-slate-900 gap-1.5">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
              <Link href={`/exam/${session.id}`}>
                <RotateCcw className="h-4 w-4" /> Retake Test
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
                <span className="text-3xl font-extrabold text-white font-mono">{scorePercentage}%</span>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Score</span>
              </div>
            </div>

            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="text-lg font-bold text-white">Excellent Work!</span>
              </div>
              <p className="text-sm text-slate-300">
                You correctly answered <span className="text-emerald-400 font-bold">{correctCount}</span> out of {totalQuestions} questions.
              </p>
              <p className="text-xs text-slate-400">
                Performance tier: <strong className="text-indigo-400">Distinction (JAMB Top 10% equivalent)</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto text-xs">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-slate-400 block mb-1">Time Expended</span>
              <span className="text-base font-bold text-white font-mono">4m 18s</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
              <span className="text-slate-400 block mb-1">Pacing</span>
              <span className="text-base font-bold text-white font-mono">51s / MCQ</span>
            </div>
          </div>
        </div>

        {/* ── Detailed Pedagogical Question Review ─────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-400" /> Complete Question Review & Explanations
            </h2>
            <span className="text-xs text-slate-400">
              Review rationale and citations for each item
            </span>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => {
              const selectedOptId = mockUserAnswers[q.id];
              const isCorrect = selectedOptId === q.correctOptionId;

              return (
                <div
                  key={q.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    isCorrect
                      ? "border-emerald-500/20 bg-emerald-950/10"
                      : "border-red-500/20 bg-red-950/10"
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-md bg-slate-800 text-xs font-bold flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">Topic: {q.topic}</span>
                      {q.sourcePage && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Source Ref: p. {q.sourcePage}
                        </span>
                      )}
                    </div>

                    <Badge variant={isCorrect ? "success" : "destructive"} className="text-xs font-mono">
                      {isCorrect ? "Correct (+1)" : "Incorrect (0)"}
                    </Badge>
                  </div>

                  {/* Question text */}
                  <p className="text-base font-medium text-white mb-5 leading-relaxed">
                    {q.question}
                  </p>

                  {/* Options */}
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const isOptionSelected = opt.id === selectedOptId;
                      const isOptionCorrect = opt.id === q.correctOptionId;

                      return (
                        <div
                          key={opt.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-medium ${
                            isOptionCorrect
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                              : isOptionSelected && !isOptionCorrect
                              ? "border-red-500/50 bg-red-500/10 text-red-300"
                              : "border-slate-800/80 bg-slate-900/40 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded font-bold text-xs flex items-center justify-center border border-current/30">
                              {letter}
                            </span>
                            <span>{opt.text}</span>
                          </div>

                          {isOptionCorrect && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" /> Correct Key
                            </span>
                          )}

                          {isOptionSelected && !isOptionCorrect && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
                              <XCircle className="h-4 w-4" /> Your Selection
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pedagogical Explanation */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 text-xs space-y-1.5">
                    <span className="font-bold text-indigo-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Conceptual Explanation
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <Button asChild variant="outline" className="border-slate-800 text-slate-300">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>

          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Link href="/dashboard/exams/builder">
              Build Next Exam <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
