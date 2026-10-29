"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FieldError } from "@/components/ui/form-alert";
import { Spinner } from "@/components/ui/spinner";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    forgotPasswordAction,
    undefined
  );

  if (state?.success) {
    return (
      <>
        <FormAlert variant="success" message={state.message} />
        <p className="mt-4 text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state?.message && !state.success && (
        <FormAlert variant="error" message={state.message} />
      )}

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

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Spinner className="h-4 w-4" label="Sending…" />
            Sending reset link…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

