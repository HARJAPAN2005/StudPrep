import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Trophy, Clock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your StudPrep learning dashboard.",
};

/**
 * Student dashboard home page.
 * Shows a welcome message and quick-action cards.
 * Analytics and session history will be populated in Phase 6.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Pick a subject below and start a practice session.
        </p>
      </div>

      {/* Stats overview — placeholder until Phase 6 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Sessions",
            value: "—",
            icon: Clock,
            color: "text-blue-500",
          },
          {
            label: "Avg Score",
            value: "—",
            icon: Trophy,
            color: "text-yellow-500",
          },
          {
            label: "Subjects",
            value: "—",
            icon: BookOpen,
            color: "text-indigo-500",
          },
          {
            label: "Improvement",
            value: "—",
            icon: TrendingUp,
            color: "text-green-500",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
          >
            <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/subjects"
            className="group rounded-xl border border-border bg-card p-6 flex items-center gap-4 hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="font-semibold text-foreground">
                Browse subjects
              </div>
              <div className="text-sm text-muted-foreground">
                Start a practice session
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/profile"
            className="group rounded-xl border border-border bg-card p-6 flex items-center gap-4 hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center text-green-600 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <TrendingUp className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Your profile</div>
              <div className="text-sm text-muted-foreground">
                View progress & settings
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
