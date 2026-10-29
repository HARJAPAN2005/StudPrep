import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Admin Console · StudPilot",
  description: "Curriculum oversight, document ingestion, and question bank moderation.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Admin Header */}
      <header className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mr-2">
            <ArrowLeft className="h-4 w-4" /> Student View
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-base text-foreground tracking-tight">StudPilot Admin Console</span>
            <Badge variant="warning" className="text-[10px] font-mono">STAFF ONLY</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/dashboard/materials">Materials View</Link>
          </Button>
          <Button asChild size="sm" className="text-xs">
            <Link href="/dashboard">Return to App</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8">
        {children}
      </main>
    </div>
  );
}
