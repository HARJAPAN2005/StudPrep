/**
 * Zod schemas for question-related data.
 * Used for both AI output validation and form validation.
 *
 * @module lib/schemas/question
 */
import { z } from "zod";

/** Valid difficulty levels for questions */
export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

/**
 * Schema for a single AI-generated question.
 * This is the contract that AI output must satisfy before being stored.
 */
export const GeneratedQuestionSchema = z.object({
  body: z
    .string()
    .min(10, "Question body must be at least 10 characters")
    .max(1000, "Question body must not exceed 1000 characters"),
  options: z
    .array(
      z
        .string()
        .min(1, "Option cannot be empty")
        .max(500, "Option must not exceed 500 characters")
    )
    .length(4, "Questions must have exactly 4 options"),
  correct_index: z
    .number()
    .int()
    .min(0)
    .max(3, "correct_index must be 0, 1, 2, or 3"),
  explanation: z
    .string()
    .min(10, "Explanation must be at least 10 characters")
    .max(2000, "Explanation must not exceed 2000 characters"),
  difficulty: DifficultySchema,
  source_page: z.number().int().positive().nullable().optional(),
});

/** Schema for the full AI response (array of questions) */
export const GeneratedQuestionsResponseSchema = z.object({
  questions: z
    .array(GeneratedQuestionSchema)
    .min(1, "AI must return at least 1 question")
    .max(50, "AI cannot return more than 50 questions"),
});

/** TypeScript type inferred from the schema */
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedQuestionsResponse = z.infer<
  typeof GeneratedQuestionsResponseSchema
>;

/** Schema for question creation form (admin) */
export const CreateQuestionSchema = z.object({
  subject_id: z.string().uuid("Invalid subject ID"),
  body: z.string().min(10).max(1000),
  options: z.array(z.string().min(1).max(500)).length(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string().min(10).max(2000),
  difficulty: DifficultySchema,
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;

