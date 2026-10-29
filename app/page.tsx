/**
 * StudPrep Landing Page
 *
 * Public marketing page shown to unauthenticated visitors.
 * Authenticated users are redirected to /dashboard by middleware.
 */
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">StudPrep</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Ace Your Exams with{" "}
            <span className="text-indigo-600">AI-Powered</span> CBT Practice
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your study materials. StudPrep&apos;s AI generates
            personalised MCQ practice sessions for JAMB, WAEC, NECO, ICAN, and
            more — timed, auto-graded, and explained.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Start practising free
            </Link>
            <Link
              href="/login"
              className="border border-border text-foreground px-8 py-4 rounded-xl text-lg font-semibold hover:bg-muted transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              icon: "📄",
              title: "Upload Study Materials",
              desc: "Drop in your PDFs and DOCX files. AI extracts key concepts automatically.",
            },
            {
              icon: "⏱",
              title: "Realistic CBT Sessions",
              desc: "Timed exams with question navigator, flagging, and auto-submit — just like the real thing.",
            },
            {
              icon: "📊",
              title: "Track Your Progress",
              desc: "Detailed analytics show your strengths, weak areas, and improvement over time.",
            },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-3">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        © 2026 StudPrep. All rights reserved.
      </footer>
    </main>
  );
}
