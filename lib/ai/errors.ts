/**
 * AI Document Intelligence Error Hierarchy
 *
 * Dedicated error models distinguishing provider failures, schema validation errors,
 * prompt injection attempts, rate limits, and timeouts.
 *
 * @module lib/ai/errors
 */

export class AIError extends Error {
  readonly code: string;
  readonly isRetryable: boolean;

  constructor(message: string, code = "AI_ERROR", isRetryable = false) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

export class AIProviderError extends AIError {
  readonly status?: number;

  constructor(message: string, status?: number, isRetryable = true) {
    super(`AI Provider Failure: ${message}`, "AI_PROVIDER_ERROR", isRetryable);
    this.name = "AIProviderError";
    this.status = status;
  }
}

export class AISchemaValidationError extends AIError {
  readonly validationIssues: string[];

  constructor(message: string, issues: string[] = []) {
    super(
      `AI Output Schema Validation Failure: ${message}${
        issues.length ? ` (${issues.join("; ")})` : ""
      }`,
      "AI_SCHEMA_VALIDATION_ERROR",
      true // Retryable: model can regenerate valid output
    );
    this.name = "AISchemaValidationError";
    this.validationIssues = issues;
  }
}

export class AITimeoutError extends AIError {
  constructor(timeoutMs: number) {
    super(`AI Generation Timed Out after ${timeoutMs}ms.`, "AI_TIMEOUT_ERROR", true);
    this.name = "AITimeoutError";
  }
}

export class AIRateLimitError extends AIError {
  readonly retryAfterMs: number;

  constructor(message = "AI API quota or rate limit exceeded.", retryAfterMs = 5000) {
    super(message, "AI_RATE_LIMIT_ERROR", true);
    this.name = "AIRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class AIContextLengthError extends AIError {
  constructor(tokenCount: number, limit: number) {
    super(
      `Document chunk token length (${tokenCount}) exceeds context limit (${limit}).`,
      "AI_CONTEXT_LENGTH_ERROR",
      false
    );
    this.name = "AIContextLengthError";
  }
}

export class AIPromptInjectionDetectedError extends AIError {
  readonly detectedPattern: string;

  constructor(pattern: string) {
    super(
      `Prompt Injection Guard Triggered: Malicious instructions detected in document evidence.`,
      "AI_PROMPT_INJECTION_DETECTED",
      false
    );
    this.name = "AIPromptInjectionDetectedError";
    this.detectedPattern = pattern;
  }
}
