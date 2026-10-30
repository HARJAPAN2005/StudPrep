import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { getAdminDashboardOverviewAction } from "@/app/actions/admin";
import { AdminConsoleClient } from "./admin-console-client";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const instant = false;

export const metadata: Metadata = {
  title: "Admin Console · StudPilot",
  description: "Curriculum oversight, processing pipelines, question moderation, and audit logs.",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/dashboard");
  }

  const result = await getAdminDashboardOverviewAction();

  if (!result.success || !result.data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Failed to Load Admin Console</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {result.error || "Unable to retrieve operational metrics from administrative datastore."}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/admin">
            <RefreshCw className="h-4 w-4" /> Retry
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System Administration & Oversight
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Monitor background ingestion pipelines, moderate flagged exam items, view AI token metrics, and inspect audit logs.
        </p>
      </div>

      <AdminConsoleClient initialData={result.data} />
    </div>
  );
}
