import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your StudPrep account.",
};

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

async function LoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  return <LoginForm redirectTo={redirectTo} />;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue to StudPrep
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" label="Loading sign in form…" />
          </div>
        }
      >
        <LoginFormWrapper searchParams={searchParams} />
      </Suspense>
    </>
  );
}
