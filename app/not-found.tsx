import Link from "next/link";
import { ArrowLeft, BookOpen, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
        <BookOpen className="h-8 w-8" aria-hidden="true" />
      </div>

      <span className="text-sm font-semibold tracking-wider uppercase text-primary mb-2">
        404 · Page Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground max-w-md mb-3">
        The page you are looking for does not exist
      </h1>

      <p className="text-muted-foreground max-w-sm mb-8 text-sm sm:text-base">
        It might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="default" size="lg">
          <Link href="/dashboard" className="gap-2">
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
