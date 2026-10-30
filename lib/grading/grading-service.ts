/**
 * Deterministic Server-Side Grading Engine
 *
 * ⚠️ CORE ARCHITECTURE RULE:
 * Authoritative grading for objective question types (single_choice, true_false)
 * is purely algorithmic and deterministic. AI models are NEVER used as authoritative
 * evaluators for objective examination items.
 *
 * @module lib/grading/grading-service
 */
import type { StudioQuestion, ExamSection } from "@/lib/schemas/exam-studio";
import type {
  QuestionGradingResult,
  SectionScore,
  TopicScore,
  TopicMasteryLevel,
  ExamGradingOutput,
  HistoricalComparison,
  GradingConfig,
} from "@/lib/schemas/grading";

export interface QuestionEvaluationInput {
  question: StudioQuestion;
  submittedOptionId?: string | null;
  sectionTitle?: string;
  defaultNegativeMarking?: number;
}

/**
 * Evaluates an individual objective question against its protected answer key.
 * Normalizes input, verifies valid options, and computes marks awarded.
 */
export function evaluateObjectiveQuestion({
  question,
  submittedOptionId,
  sectionTitle,
  defaultNegativeMarking = 0.0,
}: QuestionEvaluationInput): QuestionGradingResult {
  const maxMarks = question.marks ?? 1.0;
  const negativePenalty = question.negativeMarks ?? defaultNegativeMarking;

  // Normalize submitted answer: trim, detect empty or missing
  const rawAnswer = submittedOptionId != null ? String(submittedOptionId).trim() : "";
  const isAttempted = rawAnswer.length > 0;

  let isCorrect = false;
  let marksAwarded = 0;

  if (!isAttempted) {
    // Unanswered: no marks awarded, no penalty deducted
    isCorrect = false;
    marksAwarded = 0;
  } else {
    // Check answer against correctOptionId (case-insensitive option ID match)
    if (rawAnswer.toLowerCase() === question.correctOptionId.toLowerCase()) {
      isCorrect = true;
      marksAwarded = maxMarks;
    } else {
      isCorrect = false;
      marksAwarded = -negativePenalty;
    }
  }

  const isAiGenerated = question.sourceReference.sourceType === "ai_generated";
  const needsVerification =
    question.reviewStatus === "flagged_review" ||
    (isAiGenerated && question.reviewStatus !== "verified");

  return {
    questionId: question.id,
    body: question.body,
    submittedOptionId: isAttempted ? rawAnswer : null,
    correctOptionId: question.correctOptionId,
    isCorrect,
    isAttempted,
    marksAwarded,
    maxMarks,
    negativeMarks: negativePenalty,
    sectionId: question.sectionId ?? null,
    sectionTitle,
    topicTags: question.topicTags && question.topicTags.length > 0 ? question.topicTags : ["General"],
    explanation: question.explanation,
    options: question.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      text: opt.text,
      explanation: opt.explanation,
    })),
    sourceReference: question.sourceReference,
    reviewStatus: question.reviewStatus,
    isAiGenerated,
    needsVerification,
  };
}

/**
 * Computes topic mastery level based on percentage score.
 */
export function calculateMasteryLevel(percentage: number): TopicMasteryLevel {
  if (percentage >= 75) return "mastered";
  if (percentage >= 50) return "competent";
  return "needs_review";
}

/**
 * Deterministic exam grading algorithm.
 * Evaluates candidate answers against protected server-side snapshot questions,
 * calculates overall marks, section breakdowns, and topic mastery profiles.
 */
export function gradeExamAttempt(
  questions: StudioQuestion[],
  submittedAnswers: Record<string, string | null | undefined>,
  config: GradingConfig
): ExamGradingOutput {
  const sectionMap = new Map<string, ExamSection>();
  for (const sec of config.sections || []) {
    sectionMap.set(sec.id, sec);
  }

  const detailedResults: QuestionGradingResult[] = [];
  let totalEarnedMarks = 0;
  let totalMaxMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  // Temporary accumulators for section-wise scoring
  interface SectionAccumulator {
    sectionId: string;
    title: string;
    marksObtained: number;
    maxMarks: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
  }
  const sectionAccumulators = new Map<string, SectionAccumulator>();

  // Temporary accumulators for topic-wise scoring
  interface TopicAccumulator {
    topic: string;
    marksObtained: number;
    maxMarks: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
  }
  const topicAccumulators = new Map<string, TopicAccumulator>();

  for (const q of questions) {
    const rawAnswer = submittedAnswers[q.id];
    const section = q.sectionId ? sectionMap.get(q.sectionId) : undefined;
    const sectionTitle = section?.title;

    const evaluated = evaluateObjectiveQuestion({
      question: q,
      submittedOptionId: rawAnswer,
      sectionTitle,
      defaultNegativeMarking: config.negativeMarking,
    });

    detailedResults.push(evaluated);

    totalMaxMarks += evaluated.maxMarks;
    totalEarnedMarks += evaluated.marksAwarded;

    if (!evaluated.isAttempted) {
      unansweredCount++;
    } else if (evaluated.isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    // Accumulate Section Results
    const sId = evaluated.sectionId || "general";
    const sTitle = sectionTitle || "General Section";
    let sAcc = sectionAccumulators.get(sId);
    if (!sAcc) {
      sAcc = {
        sectionId: sId,
        title: sTitle,
        marksObtained: 0,
        maxMarks: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
      };
      sectionAccumulators.set(sId, sAcc);
    }
    sAcc.maxMarks += evaluated.maxMarks;
    sAcc.marksObtained += evaluated.marksAwarded;
    if (!evaluated.isAttempted) {
      sAcc.unansweredCount++;
    } else if (evaluated.isCorrect) {
      sAcc.correctCount++;
    } else {
      sAcc.incorrectCount++;
    }

    // Accumulate Topic Results
    const topics = evaluated.topicTags.length > 0 ? evaluated.topicTags : ["General"];
    for (const t of topics) {
      let tAcc = topicAccumulators.get(t);
      if (!tAcc) {
        tAcc = {
          topic: t,
          marksObtained: 0,
          maxMarks: 0,
          correctCount: 0,
          incorrectCount: 0,
          unansweredCount: 0,
        };
        topicAccumulators.set(t, tAcc);
      }
      tAcc.maxMarks += evaluated.maxMarks;
      tAcc.marksObtained += evaluated.marksAwarded;
      if (!evaluated.isAttempted) {
        tAcc.unansweredCount++;
      } else if (evaluated.isCorrect) {
        tAcc.correctCount++;
      } else {
        tAcc.incorrectCount++;
      }
    }
  }

  // Clamping: total marks obtained cannot be negative
  const finalMarksObtained = Math.max(0, Math.round(totalEarnedMarks * 100) / 100);
  const finalMaxMarks = Math.round(totalMaxMarks * 100) / 100;

  const scorePercentage = finalMaxMarks > 0 ? Math.min(100, Math.max(0, Math.round((finalMarksObtained / finalMaxMarks) * 100))) : 0;
  const attemptedCount = correctCount + incorrectCount;
  const accuracyPercentage = attemptedCount > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / attemptedCount) * 100))) : 0;

  // Finalize Section Scores
  const sectionScores: Record<string, SectionScore> = {};
  for (const [id, acc] of sectionAccumulators.entries()) {
    const clampedMarks = Math.max(0, Math.round(acc.marksObtained * 100) / 100);
    const secMax = Math.round(acc.maxMarks * 100) / 100;
    const secAttempted = acc.correctCount + acc.incorrectCount;
    const secPct = secMax > 0 ? Math.min(100, Math.max(0, Math.round((clampedMarks / secMax) * 100))) : 0;
    const secAcc = secAttempted > 0 ? Math.min(100, Math.max(0, Math.round((acc.correctCount / secAttempted) * 100))) : 0;

    sectionScores[id] = {
      sectionId: id,
      title: acc.title,
      marksObtained: clampedMarks,
      maxMarks: secMax,
      correctCount: acc.correctCount,
      incorrectCount: acc.incorrectCount,
      unansweredCount: acc.unansweredCount,
      accuracy: secAcc,
      percentage: secPct,
    };
  }

  // Finalize Topic Scores
  const topicScores: Record<string, TopicScore> = {};
  for (const [topic, acc] of topicAccumulators.entries()) {
    const clampedMarks = Math.max(0, Math.round(acc.marksObtained * 100) / 100);
    const topMax = Math.round(acc.maxMarks * 100) / 100;
    const topAttempted = acc.correctCount + acc.incorrectCount;
    const topPct = topMax > 0 ? Math.min(100, Math.max(0, Math.round((clampedMarks / topMax) * 100))) : 0;
    const topAcc = topAttempted > 0 ? Math.min(100, Math.max(0, Math.round((acc.correctCount / topAttempted) * 100))) : 0;

    topicScores[topic] = {
      topic,
      marksObtained: clampedMarks,
      maxMarks: topMax,
      correctCount: acc.correctCount,
      incorrectCount: acc.incorrectCount,
      unansweredCount: acc.unansweredCount,
      accuracy: topAcc,
      percentage: topPct,
      masteryLevel: calculateMasteryLevel(topPct),
    };
  }

  return {
    score: scorePercentage,
    marksObtained: finalMarksObtained,
    maxMarks: finalMaxMarks,
    accuracy: accuracyPercentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    totalQuestions: questions.length,
    attemptedCount,
    sectionScores,
    topicScores,
    detailedResults,
  };
}

export interface PriorAttemptRecord {
  id: string;
  score: number | null;
  submittedAt: string | null;
}

/**
 * Calculates authentic historical comparison without fake percentiles or ungrounded predictions.
 * Strictly adheres to rule: If there is no previous attempt, marks as baseline.
 */
export function calculateHistoricalComparison(
  currentScore: number,
  priorAttempts: PriorAttemptRecord[]
): HistoricalComparison {
  const completedPriors = priorAttempts.filter(
    (a) => a.score !== null && a.submittedAt !== null
  );

  if (completedPriors.length === 0) {
    return {
      isBaseline: true,
      previousScore: null,
      scoreDelta: null,
      previousAttemptsCount: 0,
      bestScore: currentScore,
      averageScore: currentScore,
    };
  }

  // Sort prior attempts descending by submittedAt
  const sorted = [...completedPriors].sort((a, b) => {
    const timeA = new Date(a.submittedAt!).getTime();
    const timeB = new Date(b.submittedAt!).getTime();
    return timeB - timeA;
  });

  const previousScore = sorted[0].score!;
  const scoreDelta = currentScore - previousScore;
  const allScores = [currentScore, ...completedPriors.map((a) => a.score!)];
  const bestScore = Math.max(...allScores);
  const averageScore = Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length);

  return {
    isBaseline: false,
    previousScore,
    scoreDelta,
    previousAttemptsCount: completedPriors.length,
    bestScore,
    averageScore,
  };
}

