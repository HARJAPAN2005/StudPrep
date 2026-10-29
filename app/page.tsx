import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  BarChart2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "StudPilot — AI-Powered CBT Examination Preparation Platform",
  description:
    "Turn your study materials and syllabi into authentic, timed CBT practice exams for JAMB, WAEC, NECO, and professional boards.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">StudPilot</span>
            <Badge variant="indigo" className="text-[10px] py-0 font-mono hidden sm:inline-flex">BETA</Badge>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#curriculum" className="hover:text-foreground transition-colors">Exam Boards</Link>
          <Link href="#preview" className="hover:text-foreground transition-colors">CBT Simulation</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-sm">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="text-sm shadow-sm bg-primary hover:bg-primary/90">
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-8 border-b border-border">
        {/* Subtle grid background */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:28px_28px]"></div>

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Powered Computer-Based Testing Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Turn Any Syllabus into Timed,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500">
              Authentic CBT Exams
            </span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
            Upload your PDFs, textbooks, and lecture notes. StudPilot extracts core competencies, generates schema-validated examination questions, and provides authentic timed simulations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2 shadow-md bg-primary hover:bg-primary/90 text-base h-12 px-6">
              <Link href="/sign-up">
                Start Free Practice Sprint <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base h-12 px-6">
              <Link href="/exam/session-live-sample">
                Test Live CBT Runner
              </Link>
            </Button>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Untrusted Document Isolation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Anti-Leak Answer Keys
            </span>
          </div>
        </div>
      </section>

      {/* ── Metric Proof Ribbon ───────────────────────────────────────────── */}
      <section className="border-b border-border bg-card/60 py-10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-foreground font-mono">98.4%</span>
            <p className="text-xs text-muted-foreground font-medium">Syllabus Alignment</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-foreground font-mono">15,000+</span>
            <p className="text-xs text-muted-foreground font-medium">Exam MCQs Generated</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">&lt; 1m 15s</span>
            <p className="text-xs text-muted-foreground font-medium">Average Student Pacing</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-emerald-600 font-mono">100%</span>
            <p className="text-xs text-muted-foreground font-medium">Server-Secured Answer Keys</p>
          </div>
        </div>
      </section>

      {/* ── Product Preview: Live CBT Simulation Window ───────────────────── */}
      <section id="preview" className="py-20 px-4 sm:px-8 border-b border-border bg-muted/20">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-xs">Interactive Architecture Preview</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for Serious Examination Simulation
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              The StudPilot runner strips away all distractions, providing authentic countdown timers, question palette navigation, and instant pedagogical scoring.
            </p>
          </div>

          {/* Interactive CBT Runner Mock Window */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 overflow-hidden shadow-2xl">
            {/* Window bar */}
            <div className="h-10 px-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                </div>
                <span className="text-slate-300 font-semibold font-mono text-[11px] ml-2">
                  JAMB UTME CBT RUNNER · SPRINT MODE
                </span>
              </div>
              <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold">
                <Clock className="h-3.5 w-3.5" /> 14:48 Remaining
              </div>
            </div>

            {/* Question Workspace Preview */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-center text-xs">
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-semibold">
                  Question 1 of 20
                </span>
                <span className="text-slate-400 font-medium">Use of English · Sentence Structure</span>
              </div>

              <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
                Choose the option that best conveys the meaning of the underlined clause:
                <br />
                <em className="text-indigo-300 not-italic font-semibold">&ldquo;The manager took the grievance with a grain of salt.&rdquo;</em>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl border border-indigo-500 bg-indigo-600/15 flex items-center gap-3 text-white">
                  <span className="h-6 w-6 rounded bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">A</span>
                  <span>Received it with skepticism and reservation</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3 text-slate-300">
                  <span className="h-6 w-6 rounded bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs">B</span>
                  <span>Acted upon it with severe punitive measures</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3 text-slate-300">
                  <span className="h-6 w-6 rounded bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs">C</span>
                  <span>Welcomed the petition enthusiastically</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center gap-3 text-slate-300">
                  <span className="h-6 w-6 rounded bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs">D</span>
                  <span>Referred it immediately to the advisory board</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>Anti-leak active: Answer key never present in client bundle</span>
                <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  <Link href="/exam/session-live-sample">Open Active Simulator</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ─────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-8 border-b border-border">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Engineered for Complete Exam Preparedness
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Every feature aligns with the high-stakes demands of modern computer-based examinations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Document Ingestion & Indexing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload course syllabi, lecture slides, or past revision notes. Extracted text is safely parsed and mapped into conceptual questions.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Distraction-Free CBT Environment</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Separate from normal dashboards. Features a full question palette, keyboard shortcuts, flag for review, and accurate timers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BarChart2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Readiness Analytics & Trends</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Instant diagnostic feedback post-submission. Visual trajectory charts reveal weak topics and calculate your pacing per question.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Curriculum & Exam Board Badges ────────────────────────────────── */}
      <section id="curriculum" className="py-16 px-4 sm:px-8 border-b border-border bg-card/40">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h3 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
            Curriculum Support for Leading Examination Boards
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["JAMB UTME", "WAEC WASSCE", "NECO SSCE", "ICAN Foundation", "Post-UTME", "IGCSE"].map((board) => (
              <span
                key={board}
                className="px-4 py-2 rounded-xl border border-border bg-card font-semibold text-xs tracking-wide text-foreground shadow-sm"
              >
                {board}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-10 px-4 sm:px-8 border-t border-border mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">StudPilot CBT Examination Platform</span>
            <span>·</span>
            <span>All rights reserved &copy; 2026</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="hover:text-foreground">Candidate Sign In</Link>
            <Link href="/sign-up" className="hover:text-foreground">Register</Link>
            <Link href="/admin" className="hover:text-foreground">Admin Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
