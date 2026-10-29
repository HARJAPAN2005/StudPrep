"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FieldError } from "@/components/ui/form-alert";
import { Spinner } from "@/components/ui/spinner";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Please sign in to access that protected page.",
  admin_required: "Administrator credentials are required to access the admin portal.",
  session_expired: "Your session has expired. Please sign in again to continue.",
  auth_callback_failed: "The authentication link was invalid or has expired. Please sign in with your email and password.",
};

interface LoginFormProps {
  redirectTo?: string;
  error?: string;
}

/**
 * Login form — uses React useActionState to wire the server action.
 * Renders inline field errors, an action-level error alert, and handles URL auth errors.
 */
export function LoginForm({ redirectTo, error }: LoginFormProps) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  const displayError =
    state?.message ||
    (error && (AUTH_ERROR_MESSAGES[error] || "Authentication failed. Please sign in again."));

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}

      {/* Action-level or URL-redirect error */}
      {displayError && !state?.success && (
        <FormAlert variant="error" message={displayError} />
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          aria-describedby="email-error"
          disabled={pending}
        />
        <FieldError errors={state?.errors?.email} />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          aria-describedby="password-error"
          disabled={pending}
        />
        <FieldError errors={state?.errors?.password} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Spinner className="h-4 w-4" label="Signing in…" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Create one free
        </Link>
      </p>
    </form>
  );
}
