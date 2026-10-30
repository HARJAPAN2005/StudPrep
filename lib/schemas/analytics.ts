/**
 * Analytics & AI Tutor Domain Schemas
 *
 * Strict Zod validation contracts for aggregated performance analytics,
 * AI revision plan inputs/outputs, and per-question AI tutor responses.
 *
 * @module lib/schemas/analytics
 */
import { z } from "zod";

// ── Per-exam history row ─────────────────────────────────────────────────────

export const ExamHistoryRowSchema = z.object({
  attemptId: z.string(),
  snapshotId: z.string(),
  title: z.string(),
  subjectId: z.string(),
  subjectName: z.string().optional(),
  mode: z.enum(["recreate_source", "generate_practice", "mixed"]),
  status: z.enum(["submitted", "expired"]),
  score: z.number().min(0).max(100),
  marksObtained: z.number(),
  maxMarks: z.number(),
  accuracy: z.number().min(0).max(100),
  correctCount: z.number().int(),
  incorrectCount: z.number().int(),
  unansweredCount: z.number().int(),
  totalQuestions: z.number().int(),
  timeSpentSeconds: z.number().int(),
  avgSecondsPerQuestion: z.number(),
  negativeMarksLost: z.number(),
  attemptNumber: z.number().int(),
  submittedAt: z.string(),
});
export type ExamHistoryRow = z.infer<typeof ExamHistoryRowSchema>;

// ── Topic-level aggregate ────────────────────────────────────────────────────

export const TopicAnalyticSchema = z.object({
  topic: z.string(),
  totalQuestions: z.number().int(),
  correctCount: z.number().int(),
  incorrectCount: z.number().int(),
  unansweredCount: z.number().int(),
  accuracy: z.number().min(0).max(100),       // accuracy among attempted
  overallScore: z.number().min(0).max(100),   // correct / total (including unanswered)
  marksObtained: z.number(),
  maxMarks: z.number(),
  masteryLevel: z.enum(["mastered", "competent", "needs_review"]),
  isLowSample: z.boolean(), // true if totalQuestions < MIN_RELIABLE_SAMPLE
  examCount: z.number().int(),                // how many exams contributed data
});
export type TopicAnalytic = z.infer<typeof TopicAnalyticSchema>;

// ── Difficulty-level breakdown ───────────────────────────────────────────────

export const DifficultyBreakdownSchema = z.object({
  easy:   z.object({ total: z.number().int(), correct: z.number().int(), accuracy: z.number() }),
  medium: z.object({ total: z.number().int(), correct: z.number().int(), accuracy: z.number() }),
  hard:   z.object({ total: z.number().int(), correct: z.number().int(), accuracy: z.number() }),
});
export type DifficultyBreakdown = z.infer<typeof DifficultyBreakdownSchema>;

// ── Subject-level breakdown ──────────────────────────────────────────────────

export const SubjectBreakdownSchema = z.object({
  subjectId: z.string(),
  subjectName: z.string(),
  examCount: z.number().int(),
  avgScore: z.number(),
  avgAccuracy: z.number(),
  totalQuestions: z.number().int(),
  bestScore: z.number(),
  latestScore: z.number(),
  scoreTrend: z.enum(["improving", "declining", "stable", "insufficient_data"]),
});
export type SubjectBreakdown = z.infer<typeof SubjectBreakdownSchema>;

// ── Score trend series ───────────────────────────────────────────────────────

export const ScoreTrendPointSchema = z.object({
  attemptId: z.string(),
  label: z.string(),          // "Attempt 1", "Attempt 2", etc.
  score: z.number(),
  accuracy: z.number(),
  submittedAt: z.string(),
});
export type ScoreTrendPoint = z.infer<typeof ScoreTrendPointSchema>;

// ── The Five Questions Diagnostic Schemas ────────────────────────────────────

export const MistakeDiagnosisFactorSchema = z.object({
  type: z.enum([
    "time_pressure",
    "penalty_guessing",
    "difficulty_cliff",
    "conceptual_gap",
    "calculation_error",
  ]),
  title: z.string(),
  evidence: z.string(),
});
export type MistakeDiagnosisFactor = z.infer<typeof MistakeDiagnosisFactorSchema>;

export const MistakeDiagnosisSchema = z.object({
  timePressure: z.object({
    detected: z.boolean(),
    rationale: z.string(),
    skipRate: z.number(),
    avgSecondsPerQuestion: z.number(),
  }),
  negativeMarkPenalty: z.object({
    detected: z.boolean(),
    marksLost: z.number(),
    rationale: z.string(),
  }),
  difficultyCliff: z.object({
    detected: z.boolean(),
    easyAccuracy: z.number(),
    hardAccuracy: z.number(),
    rationale: z.string(),
  }),
  calculationErrors: z
    .object({
      detected: z.boolean(),
      errorCount: z.number().int(),
      topics: z.array(z.string()),
      rationale: z.string(),
    })
    .optional(),
  recurringMistakes: z.array(
    z.object({
      topic: z.string(),
      incorrectCount: z.number().int(),
      examCount: z.number().int(),
    })
  ),
  primaryFactors: z.array(MistakeDiagnosisFactorSchema),
});
export type MistakeDiagnosis = z.infer<typeof MistakeDiagnosisSchema>;

export const FiveQuestionsDiagnosticSchema = z.object({
  whatAmIGoodAt: z.object({
    strongTopics: z.array(TopicAnalyticSchema),
    summary: z.string(),
  }),
  whereAmILosingMarks: z.object({
    weakTopics: z.array(TopicAnalyticSchema),
    marksLostBreakdown: z.object({
      penalties: z.number(),
      unattemptedMarks: z.number(),
      incorrectMarks: z.number(),
    }),
    recurringMistakeTopics: z.array(z.string()),
    summary: z.string(),
  }),
  whyAmIMakingMistakes: MistakeDiagnosisSchema,
  howAmIImproving: z.object({
    trendStatus: z.enum(["improving", "declining", "stable", "insufficient_data"]),
    scoreDelta: z.number().nullable(),
    summary: z.string(),
    attemptsCount: z.number().int(),
  }),
  whatShouldIDoNext: z.object({
    topFocusTopic: z.string().nullable(),
    recommendedAction: z.string(),
    actionSteps: z.array(z.string()),
    drillUrl: z.string().nullable(),
  }),
});
export type FiveQuestionsDiagnostic = z.infer<typeof FiveQuestionsDiagnosticSchema>;

// ── Full analytics dashboard payload ─────────────────────────────────────────

export const AnalyticsDashboardPayloadSchema = z.object({
  studentId: z.string(),
  generatedAt: z.string(),
  totalExams: z.number().int(),
  totalQuestions: z.number().int(),
  totalTimeSpentSeconds: z.number().int(),
  overallAvgScore: z.number(),
  overallAccuracy: z.number(),
  bestScore: z.number(),
  skipRate: z.number().min(0).max(100),         // % of questions left unanswered
  negativeMarkImpact: z.number(),               // total marks lost to penalties
  scoreTrend: z.array(ScoreTrendPointSchema),
  trendSufficient: z.boolean(),                 // false if < 3 exams
  subjectBreakdowns: z.array(SubjectBreakdownSchema),
  topicAnalytics: z.array(TopicAnalyticSchema),
  difficultyBreakdown: DifficultyBreakdownSchema,
  fiveQuestions: FiveQuestionsDiagnosticSchema,
  examHistory: z.array(ExamHistoryRowSchema),
  hasData: z.boolean(),
});
export type AnalyticsDashboardPayload = z.infer<typeof AnalyticsDashboardPayloadSchema>;

// ── AI Revision Plan ──────────────────────────────────────────────────────────

export const RevisionPlanInputSchema = z.object({
  studentId: z.string().uuid(),
  totalExams: z.number().int().min(1),
  overallAvgScore: z.number(),
  overallAccuracy: z.number(),
  mistakeDiagnosis: MistakeDiagnosisSchema.optional(),
  topicAnalytics: z.array(z.object({
    topic: z.string(),
    accuracy: z.number(),
    totalQuestions: z.number().int(),
    masteryLevel: z.string(),
    isLowSample: z.boolean(),
  })).max(30), // cap to keep prompt bounded
  subjectBreakdowns: z.array(z.object({
    subjectName: z.string(),
    avgScore: z.number(),
    examCount: z.number().int(),
    scoreTrend: z.string(),
  })).max(10),
});
export type RevisionPlanInput = z.infer<typeof RevisionPlanInputSchema>;

export const RevisionRecommendationSchema = z.object({
  priority: z.enum(["critical", "high", "medium"]),
  topic: z.string(),
  subject: z.string(),
  accuracy: z.number(),
  rationale: z.string().max(300),
  suggestedActions: z.array(z.string().max(150)).max(4),
  isLowSampleWarning: z.boolean(),
});

export const RevisionPlanOutputSchema = z.object({
  summary: z.string().max(600),
  recommendations: z.array(RevisionRecommendationSchema).max(10),
  suggestedPracticeSessionCount: z.number().int().min(1).max(20),
  disclaimer: z.string(),
  generatedAt: z.string(),
});
export type RevisionPlanOutput = z.infer<typeof RevisionPlanOutputSchema>;

// ── AI Question Tutor ─────────────────────────────────────────────────────────

export const TutorRequestSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().min(1),
});
export type TutorRequest = z.infer<typeof TutorRequestSchema>;

export const TutorResponseSchema = z.object({
  questionId: z.string(),
  whyCorrectIsRight: z.string().max(500),
  whyStudentWasWrong: z.string().max(500).nullable(),
  coreConceptExplained: z.string().max(600),
  simplerAnalogy: z.string().max(400),
  practiceSuggestion: z.string().max(400),
  sourceBoundNote: z.string().max(300), // e.g. "Based on page 12 of uploaded syllabus" or "Generated from general knowledge — verify against your text"
  uncertaintyLevel: z.enum(["verified_source", "inferred", "general_knowledge"]),
  fromCache: z.boolean().default(false),
});
export type TutorResponse = z.infer<typeof TutorResponseSchema>;

