import * as React from "react";
import { Suspense } from "react";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Suspense
        fallback={
          <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/60 backdrop-blur-sm shrink-0 sticky top-0 h-screen animate-pulse" />
        }
      >
        <DashboardNav />
      </Suspense>

      {/* Main Dashboard Workspace Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
