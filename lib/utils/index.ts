/**
 * Utility functions for StudPrep.
 *
 * @module lib/utils
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names, resolving conflicts.
 * Combines clsx (conditional classes) with tailwind-merge (conflict resolution).
 *
 * @example
 * cn("px-4 py-2", condition && "bg-blue-500", "bg-red-500")
 * // => "px-4 py-2 bg-red-500" (bg-blue-500 and bg-red-500 conflict; last wins)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a duration in seconds into a human-readable MM:SS string.
 *
 * @param seconds - Total seconds to format
 * @returns Formatted string like "02:45"
 *
 * @example
 * formatDuration(165) // => "02:45"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculates the percentage score.
 *
 * @param correct - Number of correct answers
 * @param total - Total number of questions
 * @returns Rounded percentage (0–100)
 */
export function calculateScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Truncates a string to a maximum length, appending an ellipsis if truncated.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum allowed length (default 100)
 */
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Returns a grade label based on a percentage score.
 *
 * @param score - Percentage score (0–100)
 */
export function getGradeLabel(score: number): string {
  if (score >= 75) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 50) return "Pass";
  if (score >= 40) return "Below Average";
  return "Fail";
}

/**
 * Formats a date string into a human-readable format.
 *
 * @param dateString - ISO 8601 date string
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

/**
 * Generates a random subset of items from an array.
 * Uses Fisher-Yates shuffle for unbiased selection.
 *
 * @param array - Source array
 * @param count - Number of items to select
 * @returns New array with `count` randomly selected items
 */
export function sampleArray<T>(array: T[], count: number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

