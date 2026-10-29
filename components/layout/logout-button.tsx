"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LogOut } from "lucide-react";

/**
 * Logout button — Client Component so it can show pending state.
 * Calls the logoutAction Server Action which destroys the session and redirects.
 */
export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isPending}
      className="gap-2 text-muted-foreground hover:text-destructive"
    >
      {isPending ? (
        <Spinner className="h-4 w-4" label="Signing out…" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">
        {isPending ? "Signing out…" : "Sign out"}
      </span>
    </Button>
  );
}

