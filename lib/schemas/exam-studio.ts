/**
 * Exam Configuration Studio & CBT Engine Domain Schemas
 *
 * Strict validation contracts for exam configuration, question verification,
 * snapshot publishing, and client-safe question sanitization.
 *
 * @module lib/schemas/exam-studio
 */
import { z } from "zod";

export const ExamModeSchema = z.enum(["recreate_source", "generate_practice", "mixed"]);
export type ExamMode = z.infer<typeof ExamModeSchema>;

export const QuestionTypeSchema = z.enum(["single_choice", "true_false"]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;

export const QuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(5), // "A", "B", "C", "D" or "T", "F"
  text: z.string().min(1, "Option text cannot be empty"),
  explanation: z.string().optional(), // Why this option is incorrect or correct
});
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

export const SourceReferenceSchema = z.object({
  pageNumber: z.number().int().positive().nullable().optional(),
  evidenceSnippet: z.string().optional(),
  sourceType: z.enum(["original_source", "ai_generated"]),
  originalQuestionNumber: z.string().optional(),
});
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

export const ReviewStatusSchema = z.enum(["verified", "flagged_review", "edited"]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const StudioQuestionSchema = z.object({
  id: z.string(),
  body: z.string().min(5, "Question stem must be at least 5 characters"),
  type: QuestionTypeSchema.default("single_choice"),
  options: z.array(QuestionOptionSchema).min(2, "At least two options are required"),
  correctOptionId: z.string().min(1, "Answer key must be specified"),
  explanation: z.string().min(5, "Detailed worked solution is required"),
  difficulty: QuestionDifficultySchema.default("medium"),
  topicTags: z.array(z.string()).default([]),
  marks: z.number().min(0.5).default(1.0),
  negativeMarks: z.number().min(0).default(0.0),
  sourceReference: SourceReferenceSchema,
  reviewStatus: ReviewStatusSchema.default("verified"),
  validationIssues: z.array(z.string()).default([]),
  orderIndex: z.number().int().default(0),
  sectionId: z.string().nullable().optional(),
});
export type StudioQuestion = z.infer<typeof StudioQuestionSchema>;

export const ExamSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(2).max(100),
  instructions: z.string().optional(),
  targetQuestionCount: z.number().int().positive().optional(),
});
export type ExamSection = z.infer<typeof ExamSectionSchema>;

export const DifficultyDistributionSchema = z.object({
  easy: z.number().min(0).max(100),
  medium: z.number().min(0).max(100),
  hard: z.number().min(0).max(100),
});
export type DifficultyDistribution = z.infer<typeof DifficultyDistributionSchema>;

export const ExamConfigurationSchema = z.object({
  title: z.string().min(3).max(200),
  subjectId: z.string().uuid("Invalid subject ID"),
  mode: ExamModeSchema.default("generate_practice"),
  materialIds: z.array(z.string().uuid()).default([]),
  topicIds: z.array(z.string()).default([]),
  questionCount: z.number().int().min(5).max(100),
  durationMinutes: z.number().int().min(5).max(240),
  difficultyDistribution: DifficultyDistributionSchema.default({ easy: 30, medium: 50, hard: 20 }),
  marksPerQuestion: z.number().min(0.5).max(20).default(1.0),
  negativeMarking: z.number().min(0).max(10).default(0.0),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  feedbackTiming: z.enum(["immediate", "after_submission"]).default("after_submission"),
  sections: z.array(ExamSectionSchema).default([]),
});
export type ExamConfiguration = z.infer<typeof ExamConfigurationSchema>;

export type SanitizedOption = Omit<QuestionOption, "explanation">;

export type SanitizedQuestion = Omit<
  StudioQuestion,
  "correctOptionId" | "explanation" | "options"
> & {
  options: SanitizedOption[];
};

/**
 * Strips answer keys and solutions before sending questions to the client during active exams.
 */
export function sanitizeQuestionForAttempt(
  question: StudioQuestion,
  shuffledOptionIds?: string[]
): SanitizedQuestion {
  let orderedOptions = question.options;
  if (shuffledOptionIds && shuffledOptionIds.length === question.options.length) {
    const map = new Map(question.options.map((o) => [o.id, o]));
    orderedOptions = shuffledOptionIds.map((id) => map.get(id)!).filter(Boolean);
  }

  return {
    id: question.id,
    body: question.body,
    type: question.type,
    difficulty: question.difficulty,
    topicTags: question.topicTags,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    sourceReference: question.sourceReference,
    reviewStatus: question.reviewStatus,
    validationIssues: question.validationIssues,
    orderIndex: question.orderIndex,
    sectionId: question.sectionId,
    options: orderedOptions.map((opt) => ({
      id: opt.id,
      label: opt.label,
      text: opt.text,
    })),
  };
}
