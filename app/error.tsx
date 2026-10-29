"use client";

import * as React from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error to monitoring if configured
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-6">
        <AlertOctagon className="h-8 w-8" aria-hidden="true" />
      </div>

      <span className="text-xs font-semibold tracking-wider uppercase text-destructive mb-2">
        System Alert
      </span>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground max-w-md mb-2">
        Something unexpected went wrong
      </h1>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {error.message || "An unexpected error occurred during execution. Please try again."}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => reset()} variant="default" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard" className="gap-2">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
