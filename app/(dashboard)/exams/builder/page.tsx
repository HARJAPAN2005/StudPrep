"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MOCK_SUBJECTS, MOCK_MATERIALS } from "@/lib/fixtures/mock-data";

type Difficulty = "easy" | "medium" | "hard" | "adaptive";
type StepNumber = 1 | 2 | 3 | 4;

export default function ExamBuilderPage() {
  const [currentStep, setCurrentStep] = React.useState<StepNumber>(1);

  // Builder configuration state
  const [selectedSubjectId, setSelectedSubjectId] = React.useState(MOCK_SUBJECTS[0].id);
  const [selectedMaterialIds, setSelectedMaterialIds] = React.useState<string[]>([MOCK_MATERIALS[0].id]);
  const [questionCount, setQuestionCount] = React.useState<10 | 20 | 40>(20);
  const [difficulty, setDifficulty] = React.useState<Difficulty>("adaptive");
  const [examMode, setExamMode] = React.useState<"strict" | "practice">("strict");
  const [timeLimitMinutes, setTimeLimitMinutes] = React.useState(30);

  const selectedSubject = MOCK_SUBJECTS.find((s) => s.id === selectedSubjectId) || MOCK_SUBJECTS[0];

  const toggleMaterial = (id: string) => {
    if (selectedMaterialIds.includes(id)) {
      if (selectedMaterialIds.length > 1) {
        setSelectedMaterialIds(selectedMaterialIds.filter((m) => m !== id));
      }
    } else {
      setSelectedMaterialIds([...selectedMaterialIds, id]);
    }
  };

  const steps = [
    { number: 1, title: "Materials" },
    { number: 2, title: "Question Spec" },
    { number: 3, title: "Mode & Time" },
    { number: 4, title: "Launch" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="indigo" className="gap-1">
            <Sparkles className="h-3 w-3" /> Step-based Exam Generator
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          CBT Examination Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure a timed, authentic computer-based testing session customized to your revision materials.
        </p>

        {/* ── Step Progress Indicator ────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 max-w-lg">
          {steps.map((st, idx) => (
            <React.Fragment key={st.number}>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(st.number as StepNumber)}
                  className={`h-8 w-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                    currentStep === st.number
                      ? "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20"
                      : currentStep > st.number
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                  aria-label={`Go to step ${st.number}: ${st.title}`}
                >
                  {currentStep > st.number ? <CheckCircle2 className="h-4 w-4" /> : st.number}
                </button>
                <span className={`text-[11px] font-medium ${currentStep === st.number ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {st.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 mb-4 transition-colors ${
                    currentStep > st.number ? "bg-emerald-600" : "bg-border"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Step 1: Select Subject & Materials ──────────────────────────────── */}
      {currentStep === 1 && (
        <Card className="animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Choose Subject and Curriculum Materials</CardTitle>
            <CardDescription>Select the examination subject and study resources to build questions from.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subject</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MOCK_SUBJECTS.map((subj) => (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subj.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedSubjectId === subj.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <p className="font-semibold text-foreground text-sm">{subj.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{subj.code} · {subj.category}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select Scope Materials</Label>
              <div className="space-y-2">
                {MOCK_MATERIALS.map((mat) => {
                  const isSelected = selectedMaterialIds.includes(mat.id);
                  return (
                    <div
                      key={mat.id}
                      onClick={() => toggleMaterial(mat.id)}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") toggleMaterial(mat.id); }}
                      className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40 bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{mat.title}</p>
                          <p className="text-xs text-muted-foreground">{mat.subjectName} · {mat.pageCount} pages · {mat.generatedQuestionsCount} questions in bank</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="hidden sm:inline-flex text-xs">{mat.fileSizeFormatted}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Question Configuration ──────────────────────────────────── */}
      {currentStep === 2 && (
        <Card className="animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Question Pool & Difficulty Configuration</CardTitle>
            <CardDescription>Determine the question density and distribution profile for this practice run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Total Questions</Label>
              <div className="grid grid-cols-3 gap-4">
                {[10, 20, 40].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count as 10 | 20 | 40)}
                    className={`py-4 px-3 rounded-xl border text-center transition-all ${
                      questionCount === count
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <span className="block text-xl font-bold text-foreground">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      {count === 10 ? "Quick Drill" : count === 20 ? "Standard CBT" : "Full Exam Simulation"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Difficulty Profile</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "adaptive" as const, label: "Adaptive AI", desc: "Adjusts to pacing" },
                  { id: "easy" as const, label: "Fundamental", desc: "Foundational concepts" },
                  { id: "medium" as const, label: "Standard", desc: "JAMB/WAEC median" },
                  { id: "hard" as const, label: "Distinction", desc: "Challenging problems" },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => setDifficulty(diff.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      difficulty === diff.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground">{diff.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{diff.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Mode & Timing ───────────────────────────────────────────── */}
      {currentStep === 3 && (
        <Card className="animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Exam Environment & Timer Parameters</CardTitle>
            <CardDescription>Select between official test simulation and guided learning modes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setExamMode("strict")}
                className={`p-5 rounded-xl border text-left transition-all ${
                  examMode === "strict"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40 bg-card"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground text-sm">Strict CBT Simulation</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Authentic exam environment. Countdown timer enabled with auto-submission. Answer keys and explanations are locked until final submission.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExamMode("practice")}
                className={`p-5 rounded-xl border text-left transition-all ${
                  examMode === "practice"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40 bg-card"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="h-5 w-5 text-emerald-500" />
                  <span className="font-semibold text-foreground text-sm">Guided Practice Mode</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Untimed or relaxed timer. Instant conceptual hints and immediate explanations after answering each question. Ideal for initial study.
                </p>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Session Duration Limit</Label>
                <span className="text-sm font-bold text-primary font-mono">{timeLimitMinutes} minutes</span>
              </div>
              <input
                type="range"
                min="5"
                max="90"
                step="5"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>5 mins (Sprint)</span>
                <span>30 mins (Recommended)</span>
                <span>90 mins (Full Length)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Summary & Launch ────────────────────────────────────────── */}
      {currentStep === 4 && (
        <Card className="animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="text-lg">Step 4: Review Parameters & Launch Session</CardTitle>
            <CardDescription>Confirm your CBT practice parameters before launching the distraction-free runner.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-muted/30">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Subject</span>
                <p className="text-sm font-bold text-foreground">{selectedSubject.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Questions</span>
                <p className="text-sm font-bold text-foreground">{questionCount} MCQs</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Duration</span>
                <p className="text-sm font-bold text-foreground font-mono">{timeLimitMinutes} mins</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Mode</span>
                <p className="text-sm font-bold text-foreground capitalize">{examMode}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Included Materials</span>
              <p className="text-xs text-muted-foreground">
                Questions will be synthesized from {selectedMaterialIds.length} syllabus resources.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Examination Runner Ready</p>
                <p className="text-xs text-muted-foreground">Launch opens an isolated, distraction-free CBT window.</p>
              </div>
              <Button asChild size="lg" className="gap-2 shadow-md bg-primary hover:bg-primary/90">
                <Link href="/exam/session-live-sample">
                  <Sparkles className="h-4 w-4" /> Start Exam Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Navigation Actions (Back / Next) ────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((currentStep - 1) as StepNumber)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Previous Step
          </Button>
        ) : (
          <div></div>
        )}

        {currentStep < 4 ? (
          <Button
            type="button"
            variant="default"
            onClick={() => setCurrentStep((currentStep + 1) as StepNumber)}
            className="gap-2"
          >
            Next Step <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
