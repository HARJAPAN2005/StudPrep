/**
 * Deterministic Grading & Result Domain Schemas
 *
 * Strict validation contracts for server-side evaluation, section-wise scoring,
 * topic mastery analysis, historical comparisons, and candidate question reporting.
 *
 * @module lib/schemas/grading
 */
import { z } from "zod";
import {
  SourceReferenceSchema,
  ReviewStatusSchema,
  ExamSectionSchema,
} from "./exam-studio";

export const QuestionGradingResultSchema = z.object({
  questionId: z.string(),
  body: z.string(),
  submittedOptionId: z.string().nullable(),
  correctOptionId: z.string(),
  isCorrect: z.boolean(),
  isAttempted: z.boolean(),
  marksAwarded: z.number(),
  maxMarks: z.number(),
  negativeMarks: z.number(),
  sectionId: z.string().nullable().optional(),
  sectionTitle: z.string().optional(),
  topicTags: z.array(z.string()).default([]),
  explanation: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      text: z.string(),
      explanation: z.string().optional(),
    })
  ),
  sourceReference: SourceReferenceSchema,
  reviewStatus: ReviewStatusSchema,
  isAiGenerated: z.boolean(),
  needsVerification: z.boolean(),
});
export type QuestionGradingResult = z.infer<typeof QuestionGradingResultSchema>;

export const SectionScoreSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  marksObtained: z.number(),
  maxMarks: z.number(),
  correctCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  unansweredCount: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
  percentage: z.number().min(0).max(100),
});
export type SectionScore = z.infer<typeof SectionScoreSchema>;

export const TopicMasteryLevelSchema = z.enum(["mastered", "competent", "needs_review"]);
export type TopicMasteryLevel = z.infer<typeof TopicMasteryLevelSchema>;

export const TopicScoreSchema = z.object({
  topic: z.string(),
  marksObtained: z.number(),
  maxMarks: z.number(),
  correctCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  unansweredCount: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
  percentage: z.number().min(0).max(100),
  masteryLevel: TopicMasteryLevelSchema,
});
export type TopicScore = z.infer<typeof TopicScoreSchema>;

export const HistoricalComparisonSchema = z.object({
  isBaseline: z.boolean(),
  previousScore: z.number().nullable(),
  scoreDelta: z.number().nullable(),
  previousAttemptsCount: z.number().int().min(0),
  bestScore: z.number().nullable(),
  averageScore: z.number().nullable(),
});
export type HistoricalComparison = z.infer<typeof HistoricalComparisonSchema>;

export const ExamGradingOutputSchema = z.object({
  score: z.number().min(0).max(100),
  marksObtained: z.number().min(0),
  maxMarks: z.number().min(0),
  accuracy: z.number().min(0).max(100),
  correctCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  unansweredCount: z.number().int().min(0),
  totalQuestions: z.number().int().min(0),
  attemptedCount: z.number().int().min(0),
  sectionScores: z.record(z.string(), SectionScoreSchema),
  topicScores: z.record(z.string(), TopicScoreSchema),
  detailedResults: z.array(QuestionGradingResultSchema),
});
export type ExamGradingOutput = z.infer<typeof ExamGradingOutputSchema>;

export const ReportIssueTypeSchema = z.enum([
  "incorrect_answer_key",
  "ambiguous_question",
  "typo_formatting",
  "outdated_syllabus",
  "other",
]);
export type ReportIssueType = z.infer<typeof ReportIssueTypeSchema>;

export const ReportQuestionInputSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID"),
  questionId: z.string().min(1, "Question ID is required"),
  issueType: ReportIssueTypeSchema,
  comment: z.string().max(1000).optional(),
});
export type ReportQuestionInput = z.infer<typeof ReportQuestionInputSchema>;

export const GradingConfigSchema = z.object({
  negativeMarking: z.number().min(0).default(0.0),
  sections: z.array(ExamSectionSchema).default([]),
});
export type GradingConfig = z.infer<typeof GradingConfigSchema>;

