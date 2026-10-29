"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FieldError } from "@/components/ui/form-alert";
import { Spinner } from "@/components/ui/spinner";

/**
 * Register form — creates a new student account.
 * After success, shows a confirmation message prompting email verification.
 */
export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);

  if (state?.success) {
    return (
      <FormAlert
        variant="success"
        message={state.message ?? "Account created! Check your email."}
      />
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {/* Action-level error */}
      {state?.message && !state.success && (
        <FormAlert variant="error" message={state.message} />
      )}

      {/* Full name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          placeholder="Amaka Okafor"
          required
          disabled={pending}
        />
        <FieldError errors={state?.errors?.full_name} />
      </div>

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
          disabled={pending}
        />
        <FieldError errors={state?.errors?.email} />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="8+ characters, letters & numbers"
          required
          disabled={pending}
        />
        <FieldError errors={state?.errors?.password} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Spinner className="h-4 w-4" label="Creating account…" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

