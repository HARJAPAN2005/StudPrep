"use client";

import * as React from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  HelpCircle,
  AlertCircle,
  Database,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getQuestionTutorAction } from "@/app/actions/analytics";
import type { TutorResponse } from "@/lib/schemas/analytics";

interface QuestionTutorPanelProps {
  attemptId: string;
  questionId: string;
}

export function QuestionTutorPanel({ attemptId, questionId }: QuestionTutorPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [tutorData, setTutorData] = React.useState<TutorResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTutor = async () => {
    if (tutorData) {
      setIsOpen((prev) => !prev);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);
    setError(null);

    try {
      const res = await getQuestionTutorAction(attemptId, questionId);
      if (res.success && res.tutor) {
        setTutorData(res.tutor);
      } else {
        setError(res.error || "AI tutor is temporarily unavailable. Please try again.");
      }
    } catch {
      setError("Failed to connect to AI tutor. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const uncertaintyBadge = (level: TutorResponse["uncertaintyLevel"]) => {
    switch (level) {
      case "verified_source":
        return (
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-800/60 bg-emerald-950/20 gap-1">
            <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
            Verified Source Grounding
          </Badge>
        );
      case "inferred":
        return (
          <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-800/60 bg-amber-950/20 gap-1">
            <HelpCircle className="h-2.5 w-2.5 text-amber-400" />
            Inferred Concept
          </Badge>
        );
      case "general_knowledge":
      default:
        return (
          <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-800/60 bg-orange-950/20 gap-1">
            <AlertCircle className="h-2.5 w-2.5 text-orange-400" />
            General Knowledge (Verify against syllabus)
          </Badge>
        );
    }
  };

  return (
    <div className="mt-3 border-t border-slate-800/80 pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={fetchTutor}
        disabled={isLoading}
        className="h-8 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 gap-1.5 px-2.5 transition-colors font-medium"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
        )}
        <span>{isOpen && tutorData ? "Hide AI Tutor Breakdown" : "Ask AI Tutor to Explain"}</span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400 ml-1" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
        )}
      </Button>

      {isOpen && (
        <div className="mt-3 rounded-xl border border-indigo-900/40 bg-slate-900/90 p-4 text-xs space-y-3 animate-in fade-in-50 duration-200">
          {isLoading && (
            <div className="flex items-center gap-2.5 py-4 text-slate-400 justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Analyzing question context & formulating pedagogical explanation...</span>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 space-y-1">
                <p className="font-medium">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTutor}
                  className="h-6 text-[11px] border-rose-800 text-rose-300 hover:bg-rose-900/40 mt-1"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {tutorData && !isLoading && (
            <>
              {/* Header metadata badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-300 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-400" /> AI Tutor Guidance
                  </span>
                  {uncertaintyBadge(tutorData.uncertaintyLevel)}
                </div>

                {tutorData.fromCache && (
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-800 gap-1 font-mono">
                    <Database className="h-2.5 w-2.5" /> Cached response
                  </Badge>
                )}
              </div>

              {/* Why Correct is Right */}
              <div className="space-y-1">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                  <CheckCircle className="h-3.5 w-3.5" /> Why the Correct Option is Right:
                </div>
                <p className="text-slate-300 leading-relaxed pl-5 text-[12px]">
                  {tutorData.whyCorrectIsRight}
                </p>
              </div>

              {/* Why Student Was Wrong (if applicable) */}
              {tutorData.whyStudentWasWrong && (
                <div className="space-y-1">
                  <div className="font-semibold text-amber-400 flex items-center gap-1.5 text-[11px]">
                    <HelpCircle className="h-3.5 w-3.5" /> Misconception Analysis:
                  </div>
                  <p className="text-slate-300 leading-relaxed pl-5 text-[12px]">
                    {tutorData.whyStudentWasWrong}
                  </p>
                </div>
              )}

              {/* Core Concept Explained */}
              <div className="space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px]">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-400" /> Core Concept:
                </div>
                <p className="text-slate-300 leading-relaxed pl-5 text-[12px]">
                  {tutorData.coreConceptExplained}
                </p>
              </div>

              {/* Simpler Analogy / Intuition */}
              <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/30 space-y-1">
                <div className="font-semibold text-indigo-300 flex items-center gap-1.5 text-[11px]">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Intuitive Analogy:
                </div>
                <p className="text-slate-300 leading-relaxed pl-5 text-[12px]">
                  {tutorData.simplerAnalogy}
                </p>
              </div>

              {/* Practice Suggestion & Source Note */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-300">Action:</span>
                  <span>{tutorData.practiceSuggestion}</span>
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  {tutorData.sourceBoundNote}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
