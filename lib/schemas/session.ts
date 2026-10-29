/**
 * Zod schemas for exam session data.
 *
 * @module lib/schemas/session
 */
import { z } from "zod";

/** Valid question count options for an exam session */
export const QUESTION_COUNT_OPTIONS = [10, 20, 40] as const;

/** Schema for creating a new exam session */
export const CreateSessionSchema = z.object({
  subject_id: z.string().uuid("Invalid subject ID"),
  question_count: z.union([z.literal(10), z.literal(20), z.literal(40)], {
    errorMap: () => ({ message: "Must be 10, 20, or 40 questions" }),
  }),
  time_limit_mins: z
    .number()
    .int()
    .min(5, "Minimum 5 minutes")
    .max(180, "Maximum 180 minutes")
    .optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

/** Schema for submitting exam answers */
export const SubmitAnswerSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
  question_id: z.string().uuid("Invalid question ID"),
  selected_index: z.number().int().min(0).max(3),
  time_spent_secs: z.number().int().min(0).optional(),
});

export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;

/** Schema for final exam submission */
export const SubmitSessionSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
});

export type SubmitSessionInput = z.infer<typeof SubmitSessionSchema>;

