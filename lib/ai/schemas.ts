/**
 * Zod Schemas for AI Document Intelligence Request & Response Contracts
 *
 * Strict validation contracts ensuring all model outputs adhere to typed structures.
 * Any model output that violates these schemas is rejected and retried.
 *
 * @module lib/ai/schemas
 */
import { z } from "zod";

// ── Stage 1: Material Classification ─────────────────────────────────────────

export const MaterialClassificationSchema = z.object({
  subject: z.string().min(2).max(100),
  educationalLevel: z.enum([
    "senior_secondary",
    "undergraduate",
    "professional",
    "general",
  ]),
  examinationType: z.enum([
    "JAMB_UTME",
    "WAEC_WASSCE",
    "NECO_SSCE",
    "ICAN",
    "GENERAL_ACADEMIC",
  ]),
  likelyLanguage: z.string().default("English"),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(500),
});

export type MaterialClassification = z.infer<typeof MaterialClassificationSchema>;
export type ExaminationType = MaterialClassification["examinationType"];
export type EducationalLevel = MaterialClassification["educationalLevel"];

// ── Stage 2: Topic & Subtopic Hierarchy ──────────────────────────────────────

export const SubtopicItemSchema = z.object({
  id: z.string(),
  title: z.string().min(2).max(150),
  pageReferences: z.array(z.number().int().positive()).min(1),
  evidenceCitation: z.string().min(5).max(300),
});

export const TopicItemSchema = z.object({
  id: z.string(),
  title: z.string().min(2).max(150),
  pageReferences: z.array(z.number().int().positive()).min(1),
  subtopics: z.array(SubtopicItemSchema).default([]),
});

export const TopicHierarchySchema = z.object({
  topics: z.array(TopicItemSchema).min(1),
});

export type TopicItem = z.infer<typeof TopicItemSchema>;
export type TopicHierarchy = z.infer<typeof TopicHierarchySchema>;

// ── Stage 3: Question & Exam Section Detection ───────────────────────────────

export const QuestionOptionSchema = z.object({
  label: z.string().min(1).max(5), // e.g. "A", "B", "C", "D"
  text: z.string().min(1),
});

export const DetectedQuestionSchema = z.object({
  id: z.string(),
  questionNumber: z.string().min(1).max(20), // e.g. "1", "14(a)", "Q3"
  body: z.string().min(5),
  options: z.array(QuestionOptionSchema).default([]),
  instructions: z.string().nullable().default(null),
  marks: z.number().nullable().default(null),
  containsTable: z.boolean().default(false),
  containsEquation: z.boolean().default(false),
  answerKey: z.string().nullable().default(null),
  isComplete: z.boolean(),
  missingElements: z.array(z.string()).default([]),
  pageNumber: z.number().int().positive(),
});

export const AnswerKeySectionSchema = z.object({
  pageNumber: z.number().int().positive(),
  notes: z.string(),
});

export const QuestionDetectionSchema = z.object({
  detectedQuestions: z.array(DetectedQuestionSchema).default([]),
  detectedAnswerKeySections: z.array(AnswerKeySectionSchema).default([]),
});

export type DetectedQuestion = z.infer<typeof DetectedQuestionSchema>;
export type QuestionDetection = z.infer<typeof QuestionDetectionSchema>;

// ── Stage 4: Extraction Warnings ─────────────────────────────────────────────

export const ExtractionWarningItemSchema = z.object({
  code: z.string(),
  pageNumber: z.number().int().positive().nullable(),
  message: z.string().min(5),
  severity: z.enum(["info", "warning", "error"]),
});

export const ExtractionWarningsSchema = z.object({
  warnings: z.array(ExtractionWarningItemSchema).default([]),
});

export type ExtractionWarningItem = z.infer<typeof ExtractionWarningItemSchema>;
export type ExtractionWarnings = z.infer<typeof ExtractionWarningsSchema>;

// ── Stage 5: Content Map & Gap Analysis ───────────────────────────────────────

export const ContentMapSchema = z.object({
  totalTopics: z.number().int().nonnegative(),
  coveragePercentage: z.number().min(0).max(100),
  estimatedDepth: z.enum(["introductory", "intermediate", "advanced"]),
  identifiedGaps: z.array(z.string()).default([]),
  recommendedPrerequisites: z.array(z.string()).default([]),
});

export type ContentMap = z.infer<typeof ContentMapSchema>;

// ── Combined Complete Analysis Report ────────────────────────────────────────

export const MaterialIntelligenceReportSchema = z.object({
  version: z.number().int().positive().default(1),
  classification: MaterialClassificationSchema,
  topicsHierarchy: z.array(TopicItemSchema),
  extractedQuestions: z.array(DetectedQuestionSchema),
  contentMap: ContentMapSchema,
  extractionWarnings: z.array(ExtractionWarningItemSchema),
  tokenUsage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
  }),
});

export type MaterialIntelligenceReport = z.infer<
  typeof MaterialIntelligenceReportSchema
>;
