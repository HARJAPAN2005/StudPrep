import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormAlertProps {
  variant?: "error" | "success" | "info";
  message?: string;
  className?: string;
}

/**
 * Displays action-level feedback (error, success, info) below a form.
 * Field-level errors are displayed inline next to their inputs.
 */
export function FormAlert({
  variant = "error",
  message,
  className,
}: FormAlertProps) {
  if (!message) return null;

  const variants = {
    error: {
      wrapper: "bg-destructive/10 border-destructive/30 text-destructive",
      icon: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    success: {
      wrapper:
        "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400",
      icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    info: {
      wrapper:
        "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400",
      icon: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
  };

  const { wrapper, icon } = variants[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        wrapper,
        className
      )}
    >
      {icon}
      <span>{message}</span>
    </div>
  );
}

/** Displays a single field-level validation error message. */
export function FieldError({
  errors,
}: {
  errors?: string[] | undefined;
}) {
  if (!errors || errors.length === 0) return null;
  return (
    <p className="text-xs text-destructive mt-1" role="alert">
      {errors[0]}
    </p>
  );
}

