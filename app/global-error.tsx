"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-900 font-sans">
        <div className="max-w-md w-full text-center space-y-4">
          <h2 className="text-2xl font-bold">Fatal Application Error</h2>
          <p className="text-sm text-slate-600">
            {error.message || "A critical error interrupted the application."}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

