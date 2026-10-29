import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Subjects",
  description: "Browse available exam subjects.",
};

/**
 * Subjects listing page — stub for Phase 2.
 * Will display subject cards with document and question counts.
 */
export default function SubjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
        <p className="mt-1 text-muted-foreground">
          Choose a subject to start a practice session.
        </p>
      </div>

      {/* Empty state — will be replaced in Phase 2 */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20 text-center gap-4">
        <BookOpen
          className="h-12 w-12 text-muted-foreground/50"
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-foreground">No subjects yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Subjects will appear here once an admin adds them.
          </p>
        </div>
      </div>
    </div>
  );
}

