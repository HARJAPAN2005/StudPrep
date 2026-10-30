import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalyticsDashboardAction } from "@/app/actions/analytics";
import { AnalyticsDashboardClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Analytics & Progress · StudPilot",
  description:
    "Data-driven insights to pinpoint weak areas before sitting official examination boards.",
};

export const instant = false;

/**
 * Server component: fetches the authenticated student's analytics payload
 * and delegates rendering to the client component.
 *
 * All data is real — no mock data is used in this page.
 */
export default async function AnalyticsPage() {
  const result = await getAnalyticsDashboardAction();

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Analytics &amp; Readiness Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Data-driven insights to pinpoint weak areas before sitting official examination boards.
          </p>
        </div>

        <Button
          asChild
          variant="default"
          size="sm"
          className="gap-2 shadow-sm bg-primary hover:bg-primary/90"
        >
          <Link href="/dashboard/exams/builder">
            <Sparkles className="h-4 w-4" /> Start Diagnostic Test
          </Link>
        </Button>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {!result.success && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground opacity-40" />
          <div>
            <p className="font-semibold text-foreground">Analytics unavailable</p>
            <p className="text-sm text-muted-foreground mt-1">
              {result.error ?? "Could not load analytics. Please refresh the page."}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      )}

      {/* ── Real analytics dashboard ─────────────────────────────────────── */}
      {result.success && result.payload && (
        <AnalyticsDashboardClient payload={result.payload} />
      )}
    </div>
  );
}
