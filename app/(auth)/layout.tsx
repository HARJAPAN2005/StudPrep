import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in to StudPrep",
};

/**
 * Auth layout — centered card shell used by login, register, forgot-password.
 * No navigation; users are not authenticated yet.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4 py-12">
      {/* Brand */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
      >
        <span className="text-2xl font-bold">StudPrep</span>
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
          Beta
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-sm p-8">
        {children}
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        By using StudPrep you agree to our{" "}
        <span className="underline cursor-pointer">Terms of Service</span> and{" "}
        <span className="underline cursor-pointer">Privacy Policy</span>.
      </p>
    </div>
  );
}

