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

  return {
    studentId,
    generatedAt: new Date().toISOString(),
    totalExams: finalized.length,
    totalQuestions: totalQ,
    totalTimeSpentSeconds: totalTimeSpent,
    overallAvgScore: roundTwo(allScores.reduce((a, b) => a + b, 0) / allScores.length),
    overallAccuracy: roundTwo(allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length),
    bestScore: Math.max(...allScores),
    skipRate: safePct(totalUnanswered, totalQ),
    negativeMarkImpact: totalNegativeImpact,
    scoreTrend,
    trendSufficient,
    subjectBreakdowns,
    topicAnalytics,
    difficultyBreakdown,
    examHistory: historyRows,
    hasData: true,
  };
}

