/**
 * Analytics Aggregation Engine
 *
 * Pure functions that derive performance analytics from finalized exam attempt
 * records. Has zero external dependencies (no DB, no AI calls) — testable in
 * isolation.
 *
 * Metric definitions used consistently throughout:
 *   - "accuracy" = correct / attempted  (excludes unanswered questions)
 *   - "overall score" = correct / total  (includes unanswered as incorrect-equivalent)
 *   - "skip rate" = unanswered / total questions across all attempts
 *   - "negative mark impact" = sum of all negative penalty deductions (positive number)
 *
 * @module lib/analytics/analytics-engine
 */

import type {
  ExamHistoryRow,
  TopicAnalytic,
  DifficultyBreakdown,
  SubjectBreakdown,
  ScoreTrendPoint,
  AnalyticsDashboardPayload,
  FiveQuestionsDiagnostic,
  MistakeDiagnosis,
  MistakeDiagnosisFactor,
} from "@/lib/schemas/analytics";
import type { QuestionGradingResult } from "@/lib/schemas/grading";

/** Minimum questions needed for a topic estimate to be considered reliable */
export const MIN_RELIABLE_SAMPLE = 5;

/** Minimum exams needed for a trend to be considered reliable */
export const MIN_TREND_EXAMS = 3;

/** Raw attempt data as pulled from the database */
export interface RawAttemptRecord {
  id: string;
  snapshot_id: string;
  student_id: string;
  status: "submitted" | "expired";
  score: number | null;
  marks_obtained: number | null;
  max_marks: number | null;
  accuracy: number | null;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  time_spent_seconds: number;
  attempt_number: number;
  submitted_at: string | null;
  detailed_results: QuestionGradingResult[] | unknown;
  topic_scores: unknown;
  section_scores: unknown;
}

/** Raw snapshot data */
export interface RawSnapshotRecord {
  id: string;
  title: string;
  subject_id: string;
  mode: "recreate_source" | "generate_practice" | "mixed";
  total_questions: number;
}

/** Subject name lookup */
export type SubjectNameMap = Record<string, string>;

function safeDetailedResults(raw: unknown): QuestionGradingResult[] {
  if (!Array.isArray(raw)) return [];
  return raw as QuestionGradingResult[];
}

function safePct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)));
}

function roundTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Enriches each finalized attempt into a typed ExamHistoryRow,
 * calculating per-question pacing and negative mark impact.
 */
export function buildExamHistory(
  attempts: RawAttemptRecord[],
  snapshots: Map<string, RawSnapshotRecord>,
  subjectNames: SubjectNameMap
): ExamHistoryRow[] {
  return attempts
    .filter((a) => a.score !== null && a.submitted_at !== null)
    .map((a) => {
      const snap = snapshots.get(a.snapshot_id);
      const totalQ = a.correct_count + a.incorrect_count + a.unanswered_count;
      const avgSecondsPerQ = totalQ > 0 ? roundTwo(a.time_spent_seconds / totalQ) : 0;

      // Negative marks lost = sum of negative marksAwarded values in detailed_results
      const detailedResults = safeDetailedResults(a.detailed_results);
      const negativeMarksLost = roundTwo(
        detailedResults.reduce((sum, q) => sum + (q.marksAwarded < 0 ? Math.abs(q.marksAwarded) : 0), 0)
      );

      return {
        attemptId: a.id,
        snapshotId: a.snapshot_id,
        title: snap?.title ?? "Unknown Exam",
        subjectId: snap?.subject_id ?? "",
        subjectName: snap?.subject_id ? subjectNames[snap.subject_id] : undefined,
        mode: snap?.mode ?? "generate_practice",
        status: a.status,
        score: a.score ?? 0,
        marksObtained: roundTwo(Number(a.marks_obtained ?? 0)),
        maxMarks: roundTwo(Number(a.max_marks ?? 0)),
        accuracy: roundTwo(Number(a.accuracy ?? 0)),
        correctCount: a.correct_count,
        incorrectCount: a.incorrect_count,
        unansweredCount: a.unanswered_count,
        totalQuestions: totalQ,
        timeSpentSeconds: a.time_spent_seconds,
        avgSecondsPerQuestion: avgSecondsPerQ,
        negativeMarksLost,
        attemptNumber: a.attempt_number,
        submittedAt: a.submitted_at!,
      };
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

/**
 * Aggregates topic-level accuracy and question counts across all detailed results.
 * Topics with fewer than MIN_RELIABLE_SAMPLE questions are flagged isLowSample=true.
 */
export function computeTopicAnalytics(
  historyRows: ExamHistoryRow[],
  attempts: RawAttemptRecord[]
): TopicAnalytic[] {
  const topicMap = new Map<string, {
    total: number; correct: number; incorrect: number; unanswered: number;
    marksObtained: number; maxMarks: number; examIds: Set<string>;
  }>();

  for (const a of attempts) {
    const detailedResults = safeDetailedResults(a.detailed_results);
    for (const q of detailedResults) {
      const tags = q.topicTags && q.topicTags.length > 0 ? q.topicTags : ["General"];
      for (const tag of tags) {
        const entry = topicMap.get(tag) ?? {
          total: 0, correct: 0, incorrect: 0, unanswered: 0,
          marksObtained: 0, maxMarks: 0, examIds: new Set<string>(),
        };
        entry.total++;
        if (!q.isAttempted) entry.unanswered++;
        else if (q.isCorrect) entry.correct++;
        else entry.incorrect++;
        entry.marksObtained += q.marksAwarded < 0 ? 0 : q.marksAwarded;
        entry.maxMarks += q.maxMarks;
        entry.examIds.add(a.id);
        topicMap.set(tag, entry);
      }
    }
  }

  const analytics: TopicAnalytic[] = [];
  for (const [topic, data] of topicMap.entries()) {
    const attempted = data.correct + data.incorrect;
    const accuracy = safePct(data.correct, attempted);         // among attempted
    const overallScore = safePct(data.correct, data.total);    // including unanswered

    const masteryLevel: TopicAnalytic["masteryLevel"] =
      overallScore >= 75 ? "mastered" : overallScore >= 50 ? "competent" : "needs_review";

    analytics.push({
      topic,
      totalQuestions: data.total,
      correctCount: data.correct,
      incorrectCount: data.incorrect,
      unansweredCount: data.unanswered,
      accuracy,
      overallScore,
      marksObtained: roundTwo(data.marksObtained),
      maxMarks: roundTwo(data.maxMarks),
      masteryLevel,
      isLowSample: data.total < MIN_RELIABLE_SAMPLE,
      examCount: data.examIds.size,
    });
  }

  return analytics.sort((a, b) => a.accuracy - b.accuracy); // worst first
}

/**
 * Computes accuracy breakdown by question difficulty across all attempts.
 */
export function computeDifficultyBreakdown(attempts: RawAttemptRecord[]): DifficultyBreakdown {
  const acc: DifficultyBreakdown = {
    easy:   { total: 0, correct: 0, accuracy: 0 },
    medium: { total: 0, correct: 0, accuracy: 0 },
    hard:   { total: 0, correct: 0, accuracy: 0 },
  };

  for (const a of attempts) {
    const results = safeDetailedResults(a.detailed_results);
    for (const q of results) {
      // Difficulty is embedded in StudioQuestion, accessible via sourceReference type
      // We tag it through topicTags convention; if not available, classify by mark weight
      // Here we read the difficulty from the question's own data if available
      const diff = (q as unknown as { difficulty?: string }).difficulty;
      const bucket = diff === "easy" ? "easy" : diff === "hard" ? "hard" : "medium";
      acc[bucket].total++;
      if (q.isCorrect) acc[bucket].correct++;
    }
  }

  for (const key of ["easy", "medium", "hard"] as const) {
    const b = acc[key];
    b.accuracy = safePct(b.correct, b.total);
  }

  return acc;
}

/**
 * Computes subject-level aggregated performance including trend direction.
 */
export function computeSubjectBreakdowns(
  historyRows: ExamHistoryRow[],
  subjectNames: SubjectNameMap
): SubjectBreakdown[] {
  const subjectMap = new Map<string, {
    subjectId: string;
    scores: { score: number; submittedAt: string }[];
    accuracies: number[];
    totalQuestions: number;
  }>();

  for (const row of historyRows) {
    const sid = row.subjectId;
    if (!sid) continue;
    const entry = subjectMap.get(sid) ?? { subjectId: sid, scores: [], accuracies: [], totalQuestions: 0 };
    entry.scores.push({ score: row.score, submittedAt: row.submittedAt });
    entry.accuracies.push(row.accuracy);
    entry.totalQuestions += row.totalQuestions;
    subjectMap.set(sid, entry);
  }

  const results: SubjectBreakdown[] = [];
  for (const [sid, data] of subjectMap.entries()) {
    const sorted = [...data.scores].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    const allScores = sorted.map((s) => s.score);
    const avgScore = roundTwo(allScores.reduce((a, b) => a + b, 0) / allScores.length);
    const avgAccuracy = roundTwo(data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length);
    const bestScore = Math.max(...allScores);
    const latestScore = allScores[allScores.length - 1] ?? 0;

    let scoreTrend: SubjectBreakdown["scoreTrend"] = "insufficient_data";
    if (allScores.length >= MIN_TREND_EXAMS) {
      const firstHalf = allScores.slice(0, Math.floor(allScores.length / 2));
      const secondHalf = allScores.slice(Math.ceil(allScores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const delta = secondAvg - firstAvg;
      scoreTrend = delta > 3 ? "improving" : delta < -3 ? "declining" : "stable";
    }

    results.push({
      subjectId: sid,
      subjectName: subjectNames[sid] ?? sid,
      examCount: allScores.length,
      avgScore,
      avgAccuracy,
      totalQuestions: data.totalQuestions,
      bestScore,
      latestScore,
      scoreTrend,
    });
  }

  return results.sort((a, b) => a.avgScore - b.avgScore); // weakest first
}

/**
 * Builds the chronological score trend series.
 * Returns an insufficiency flag when fewer than MIN_TREND_EXAMS exams exist.
 */
export function computeScoreTrend(historyRows: ExamHistoryRow[]): {
  points: ScoreTrendPoint[];
  trendSufficient: boolean;
} {
  const sorted = [...historyRows].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );

  const points: ScoreTrendPoint[] = sorted.map((row, i) => ({
    attemptId: row.attemptId,
    label: `Attempt ${i + 1}`,
    score: row.score,
    accuracy: row.accuracy,
    submittedAt: row.submittedAt,
  }));

  return { points, trendSufficient: sorted.length >= MIN_TREND_EXAMS };
}

/**
 * Calculates code-driven diagnosis of reasons behind student mistakes ("Why am I making mistakes?").
 * Never invents reasons — purely derives from attempt pacing, negative marking, difficulty deltas, and recurring gaps.
 */
export function computeMistakeDiagnosis(
  historyRows: ExamHistoryRow[],
  topicAnalytics: TopicAnalytic[],
  difficultyBreakdown: DifficultyBreakdown,
  skipRate: number,
  negativeMarkImpact: number,
  totalQuestions: number,
  totalTimeSpentSeconds: number,
  attempts: RawAttemptRecord[] = []
): MistakeDiagnosis {
  const avgSecondsPerQ = totalQuestions > 0 ? Math.round(totalTimeSpentSeconds / totalQuestions) : 0;

  // 1. Time Pressure / Pacing
  // Evidenced by: high skip rate (> 12%) or average time < 25s with high error rate
  const isRushed = avgSecondsPerQ > 0 && avgSecondsPerQ < 25;
  const isHighSkip = skipRate > 12;
  const timePressureDetected = isHighSkip || isRushed;
  const timePressureRationale = isHighSkip
    ? `You skipped ${skipRate}% of questions, pointing to running out of time or avoidance under pacing pressure.`
    : isRushed
      ? `You spent only ${avgSecondsPerQ}s per question on average, which indicates rushing through items.`
      : `Pacing was controlled at ${avgSecondsPerQ}s per question with a manageable ${skipRate}% skip rate.`;

  // 2. Negative Marking Penalty / Unwarranted Guessing
  const penaltyDetected = negativeMarkImpact > 0;
  const penaltyRationale = penaltyDetected
    ? `You lost ${negativeMarkImpact} marks from negative penalties. Blind guessing reduced your score below what selective omission would yield.`
    : `No marks were lost to negative penalty deductions.`;

  // 3. Difficulty Cliff (advanced complexity friction vs basic concepts)
  const easyAcc = difficultyBreakdown.easy.total > 0 ? difficultyBreakdown.easy.accuracy : 0;
  const hardAcc = difficultyBreakdown.hard.total > 0 ? difficultyBreakdown.hard.accuracy : 0;
  const hasHardQuestions = difficultyBreakdown.hard.total >= 2;
  const difficultyCliffDetected = hasHardQuestions && easyAcc >= 65 && hardAcc < 45;
  const difficultyCliffRationale = difficultyCliffDetected
    ? `Clear performance cliff: ${easyAcc}% on easy items dropping to ${hardAcc}% on hard items. Core principles are grasped, but complex multi-step problems create friction.`
    : hasHardQuestions
      ? `Performance between easy (${easyAcc}%) and hard (${hardAcc}%) questions remained relatively consistent.`
      : `Insufficient hard questions encountered yet to determine complexity threshold.`;

  // 4. Recurring Topic Mistakes (mistakes in the same topic across >= 2 attempts)
  const recurringMistakes: MistakeDiagnosis["recurringMistakes"] = topicAnalytics
    .filter((t) => t.examCount >= 2 && t.incorrectCount >= 2)
    .map((t) => ({
      topic: t.topic,
      incorrectCount: t.incorrectCount,
      examCount: t.examCount,
    }));

  // 5. Calculation / Formula Errors (backed by quantitative attempts)
  const QUANTITATIVE_REGEX = /(math|algebra|calcul|arithm|geometr|statist|trig|physic|chem|stoich|kinemat|numer|equation|formula)/i;
  const calcMistakeTopics = new Set<string>();
  let calcErrorCount = 0;

  for (const a of attempts) {
    const detailed = safeDetailedResults(a.detailed_results);
    for (const q of detailed) {
      if (q.isAttempted && !q.isCorrect) {
        const isQuantTopic = (q.topicTags ?? []).some((t) => QUANTITATIVE_REGEX.test(t));
        const hasNumericOptions = q.options?.some(
          (o) => /^\s*[\d+-]/.test(o.text) || /\b\d+(\.\d+)?\b/.test(o.text)
        );
        const mentionsCalc = /(calculat|arithmetic|formula|sign error|computation)/i.test(q.explanation || "");
        if (isQuantTopic || hasNumericOptions || mentionsCalc) {
          calcErrorCount++;
          const primaryTag = q.topicTags?.[0] || "Quantitative Topics";
          calcMistakeTopics.add(primaryTag);
        }
      }
    }
  }

  const calculationDetected = calcErrorCount > 0;
  const calcTopicsList = Array.from(calcMistakeTopics);
  const calculationRationale = calculationDetected
    ? `${calcErrorCount} calculation- or formula-related error${calcErrorCount === 1 ? "" : "s"} detected across ${calcTopicsList.slice(0, 3).join(", ")}.`
    : `No systematic calculation or arithmetic errors identified.`;

  // 6. Compile Primary Factors supported by concrete code evidence
  const primaryFactors: MistakeDiagnosisFactor[] = [];

  if (recurringMistakes.length > 0) {
    const topRecurring = recurringMistakes.slice(0, 2).map((r) => r.topic).join(", ");
    primaryFactors.push({
      type: "conceptual_gap",
      title: "Conceptual Misunderstandings",
      evidence: `Persistent errors detected in ${topRecurring} across multiple completed sessions.`,
    });
  }

  if (calculationDetected) {
    primaryFactors.push({
      type: "calculation_error",
      title: "Calculation & Formula Errors",
      evidence: calculationRationale,
    });
  }

  if (timePressureDetected) {
    primaryFactors.push({
      type: "time_pressure",
      title: "Time Pressure & Pacing",
      evidence: isHighSkip
        ? `${skipRate}% of all exam items were left unattempted.`
        : `Rushed pacing at ${avgSecondsPerQ}s/question.`,
    });
  }

  if (penaltyDetected) {
    primaryFactors.push({
      type: "penalty_guessing",
      title: "Tactical Guessing Penalty",
      evidence: `Lost ${negativeMarkImpact} marks to penalty deductions. Skipping uncertain questions will protect your score.`,
    });
  }

  if (difficultyCliffDetected) {
    primaryFactors.push({
      type: "difficulty_cliff",
      title: "High-Complexity Problem Friction",
      evidence: `Accuracy drops from ${easyAcc}% on easy items to ${hardAcc}% on hard items.`,
    });
  }

  return {
    timePressure: {
      detected: timePressureDetected,
      rationale: timePressureRationale,
      skipRate,
      avgSecondsPerQuestion: avgSecondsPerQ,
    },
    negativeMarkPenalty: {
      detected: penaltyDetected,
      marksLost: negativeMarkImpact,
      rationale: penaltyRationale,
    },
    difficultyCliff: {
      detected: difficultyCliffDetected,
      easyAccuracy: easyAcc,
      hardAccuracy: hardAcc,
      rationale: difficultyCliffRationale,
    },
    calculationErrors: {
      detected: calculationDetected,
      errorCount: calcErrorCount,
      topics: calcTopicsList,
      rationale: calculationRationale,
    },
    recurringMistakes,
    primaryFactors,
  };
}

/**
 * Builds the complete answers to the 5 Core Questions requested by the diagnostic system:
 * 1. What am I good at? (Strong topics backed by actual attempts)
 * 2. Where am I losing marks? (Weak topics and recurring mistakes)
 * 3. Why am I making mistakes? (Calculated evidence: conceptual, time pressure, calculation/guessing)
 * 4. How am I improving? (Trend over completed attempts)
 * 5. What should I do next? (Focused practice and revision plan)
 */
export function computeFiveQuestionsDiagnostic(
  historyRows: ExamHistoryRow[],
  topicAnalytics: TopicAnalytic[],
  difficultyBreakdown: DifficultyBreakdown,
  scoreTrend: ScoreTrendPoint[],
  trendSufficient: boolean,
  skipRate: number,
  negativeMarkImpact: number,
  totalQuestions: number,
  totalTimeSpentSeconds: number,
  attempts: RawAttemptRecord[] = []
): FiveQuestionsDiagnostic {
  // 1. What am I good at? (Strong topics: accuracy >= 70% or overallScore >= 65%)
  const strongTopics = topicAnalytics
    .filter((t) => t.accuracy >= 70 || t.masteryLevel === "mastered")
    .sort((a, b) => b.accuracy - a.accuracy);

  const strongSummary = strongTopics.length > 0
    ? `Demonstrated mastery in ${strongTopics.length} topic${strongTopics.length === 1 ? "" : "s"}, led by ${strongTopics[0].topic} (${strongTopics[0].accuracy}% accuracy across ${strongTopics[0].totalQuestions} questions).`
    : `Complete more practice attempts to establish your foundational strong topics.`;

  // 2. Where am I losing marks? (Weak topics: accuracy < 65% or needs_review)
  const weakTopics = topicAnalytics
    .filter((t) => t.accuracy < 65 || t.masteryLevel === "needs_review")
    .sort((a, b) => a.accuracy - b.accuracy); // worst first

  const totalUnattemptedQ = historyRows.reduce((s, r) => s + r.unansweredCount, 0);
  const totalIncorrectQ = historyRows.reduce((s, r) => s + r.incorrectCount, 0);

  const mistakeDiagnosis = computeMistakeDiagnosis(
    historyRows,
    topicAnalytics,
    difficultyBreakdown,
    skipRate,
    negativeMarkImpact,
    totalQuestions,
    totalTimeSpentSeconds,
    attempts
  );

  const recurringMistakeTopics = mistakeDiagnosis.recurringMistakes.map((r) => r.topic);

  const weakSummary = weakTopics.length > 0
    ? `Marks are predominantly lost in ${weakTopics[0].topic} (${weakTopics[0].accuracy}% accuracy) along with ${totalIncorrectQ} incorrect answers and ${totalUnattemptedQ} skipped questions.`
    : `No severe topic deficiencies identified yet across your completed attempts.`;

  // 4. How am I improving?
  let trendStatus: FiveQuestionsDiagnostic["howAmIImproving"]["trendStatus"] = "insufficient_data";
  let scoreDelta: number | null = null;
  let trendSummary = `Complete at least ${MIN_TREND_EXAMS} exam attempts to establish an authentic trend.`;

  if (trendSufficient && scoreTrend.length >= 2) {
    const firstScore = scoreTrend[0].score;
    const latestScore = scoreTrend[scoreTrend.length - 1].score;
    scoreDelta = roundTwo(latestScore - firstScore);

    if (scoreDelta > 3) {
      trendStatus = "improving";
      trendSummary = `Score trajectory is improving (+${scoreDelta}% gained from Attempt 1 to Attempt ${scoreTrend.length}).`;
    } else if (scoreDelta < -3) {
      trendStatus = "declining";
      trendSummary = `Score trajectory has dipped (${scoreDelta}% from Attempt 1 to Attempt ${scoreTrend.length}). Review recent weak topics.`;
    } else {
      trendStatus = "stable";
      trendSummary = `Score trajectory has held steady within 3% across ${scoreTrend.length} completed attempts.`;
    }
  }

  // 5. What should I do next?
  const topFocus = weakTopics.length > 0 ? weakTopics[0].topic : null;
  const actionSteps: string[] = [];

  if (topFocus) {
    actionSteps.push(`Targeted drill on ${topFocus} (currently at ${weakTopics[0].accuracy}% accuracy).`);
  }
  if (mistakeDiagnosis.negativeMarkPenalty.detected) {
    actionSteps.push(`Practice tactical omission: skip uncertain questions to eliminate the ${negativeMarkImpact} penalty deductions.`);
  }
  if (mistakeDiagnosis.timePressure.detected) {
    actionSteps.push(`Set a strict 60-second limit per question during your next practice sprint to address pacing.`);
  }
  if (actionSteps.length === 0) {
    actionSteps.push("Generate a full-length mixed practice exam to maintain subject mastery.");
  }

  const recommendedAction = topFocus
    ? `Focus immediate practice on ${topFocus} and address ${mistakeDiagnosis.primaryFactors[0]?.title || "pacing"}.`
    : "Continue balanced practice sprints across your subject syllabi.";

  return {
    whatAmIGoodAt: {
      strongTopics,
      summary: strongSummary,
    },
    whereAmILosingMarks: {
      weakTopics,
      marksLostBreakdown: {
        penalties: negativeMarkImpact,
        unattemptedMarks: totalUnattemptedQ,
        incorrectMarks: totalIncorrectQ,
      },
      recurringMistakeTopics,
      summary: weakSummary,
    },
    whyAmIMakingMistakes: mistakeDiagnosis,
    howAmIImproving: {
      trendStatus,
      scoreDelta,
      summary: trendSummary,
      attemptsCount: scoreTrend.length,
    },
    whatShouldIDoNext: {
      topFocusTopic: topFocus,
      recommendedAction,
      actionSteps,
      drillUrl: topFocus ? `/dashboard/exams/builder?topic=${encodeURIComponent(topFocus)}` : null,
    },
  };
}

/**
 * Master aggregation function that produces the complete analytics dashboard payload.
 */
export function buildAnalyticsDashboard(
  studentId: string,
  attempts: RawAttemptRecord[],
  snapshots: Map<string, RawSnapshotRecord>,
  subjectNames: SubjectNameMap
): AnalyticsDashboardPayload {
  const finalized = attempts.filter((a) => a.score !== null && a.submitted_at !== null);
  const hasData = finalized.length > 0;

  if (!hasData) {
    const empty: DifficultyBreakdown = {
      easy: { total: 0, correct: 0, accuracy: 0 },
      medium: { total: 0, correct: 0, accuracy: 0 },
      hard: { total: 0, correct: 0, accuracy: 0 },
    };
    const emptyFiveQuestions: FiveQuestionsDiagnostic = {
      whatAmIGoodAt: {
        strongTopics: [],
        summary: "Complete your first exam to identify your strengths.",
      },
      whereAmILosingMarks: {
        weakTopics: [],
        marksLostBreakdown: { penalties: 0, unattemptedMarks: 0, incorrectMarks: 0 },
        recurringMistakeTopics: [],
        summary: "No exam attempts on record.",
      },
      whyAmIMakingMistakes: {
        timePressure: { detected: false, rationale: "No data.", skipRate: 0, avgSecondsPerQuestion: 0 },
        negativeMarkPenalty: { detected: false, marksLost: 0, rationale: "No data." },
        difficultyCliff: { detected: false, easyAccuracy: 0, hardAccuracy: 0, rationale: "No data." },
        calculationErrors: { detected: false, errorCount: 0, topics: [], rationale: "No data." },
        recurringMistakes: [],
        primaryFactors: [],
      },
      howAmIImproving: {
        trendStatus: "insufficient_data",
        scoreDelta: null,
        summary: "Complete at least 3 exams to track your improvement trend.",
        attemptsCount: 0,
      },
      whatShouldIDoNext: {
        topFocusTopic: null,
        recommendedAction: "Start by sitting a diagnostic practice exam.",
        actionSteps: ["Select a syllabus material", "Configure your first practice test"],
        drillUrl: null,
      },
    };

    return {
      studentId,
      generatedAt: new Date().toISOString(),
      totalExams: 0,
      totalQuestions: 0,
      totalTimeSpentSeconds: 0,
      overallAvgScore: 0,
      overallAccuracy: 0,
      bestScore: 0,
      skipRate: 0,
      negativeMarkImpact: 0,
      scoreTrend: [],
      trendSufficient: false,
      subjectBreakdowns: [],
      topicAnalytics: [],
      difficultyBreakdown: empty,
      fiveQuestions: emptyFiveQuestions,
      examHistory: [],
      hasData: false,
    };
  }

  const historyRows = buildExamHistory(finalized, snapshots, subjectNames);
  const { points: scoreTrend, trendSufficient } = computeScoreTrend(historyRows);
  const topicAnalytics = computeTopicAnalytics(historyRows, finalized);
  const subjectBreakdowns = computeSubjectBreakdowns(historyRows, subjectNames);
  const difficultyBreakdown = computeDifficultyBreakdown(finalized);

  const allScores = finalized.map((a) => a.score ?? 0);
  const totalQ = historyRows.reduce((s, r) => s + r.totalQuestions, 0);
  const totalUnanswered = historyRows.reduce((s, r) => s + r.unansweredCount, 0);
  const totalTimeSpent = historyRows.reduce((s, r) => s + r.timeSpentSeconds, 0);
  const totalNegativeImpact = roundTwo(historyRows.reduce((s, r) => s + r.negativeMarksLost, 0));
  const allAccuracies = finalized.map((a) => Number(a.accuracy ?? 0));
  const skipRate = safePct(totalUnanswered, totalQ);

  const fiveQuestions = computeFiveQuestionsDiagnostic(
    historyRows,
    topicAnalytics,
    difficultyBreakdown,
    scoreTrend,
    trendSufficient,
    skipRate,
    totalNegativeImpact,
    totalQ,
    totalTimeSpent,
    finalized
  );

  return {
    studentId,
    generatedAt: new Date().toISOString(),
    totalExams: finalized.length,
    totalQuestions: totalQ,
    totalTimeSpentSeconds: totalTimeSpent,
    overallAvgScore: roundTwo(allScores.reduce((a, b) => a + b, 0) / allScores.length),
    overallAccuracy: roundTwo(allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length),
    bestScore: Math.max(...allScores),
    skipRate,
    negativeMarkImpact: totalNegativeImpact,
    scoreTrend,
    trendSufficient,
    subjectBreakdowns,
    topicAnalytics,
    difficultyBreakdown,
    fiveQuestions,
    examHistory: historyRows,
    hasData: true,
  };
}

