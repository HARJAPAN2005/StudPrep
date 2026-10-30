"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FieldError } from "@/components/ui/form-alert";
import { Spinner } from "@/components/ui/spinner";

interface ProfileFormProps {
  initialFullName: string | null;
  email: string;
}

/**
 * Profile edit form — lets users update their display name.
 */
export function ProfileForm({ initialFullName, email }: ProfileFormProps) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    undefined
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-5 max-w-md">
      {state?.message && (
        <FormAlert
          variant={state.success ? "success" : "error"}
          message={state.message}
        />
      )}

      {/* Email — read-only */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email-display">Email address</Label>
        <Input
          id="email-display"
          type="email"
          value={email}
          readOnly
          disabled
          className="opacity-70 cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed here.
        </p>
      </div>

      {/* Full name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          defaultValue={initialFullName ?? ""}
          placeholder="Your full name"
          required
          disabled={pending}
        />
        <FieldError errors={state?.errors?.full_name} />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Spinner className="h-4 w-4" label="Saving…" />
            Saving…
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
}

