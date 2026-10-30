import { describe, it, expect } from "vitest";
import {
  buildExamHistory,
  computeTopicAnalytics,
  computeDifficultyBreakdown,
  computeSubjectBreakdowns,
  computeScoreTrend,
  buildAnalyticsDashboard,
  computeMistakeDiagnosis,
  computeFiveQuestionsDiagnostic,
  MIN_RELIABLE_SAMPLE,
  MIN_TREND_EXAMS,
} from "../analytics-engine";
import type { RawAttemptRecord, RawSnapshotRecord } from "../analytics-engine";

const SUBJECT_MAP = { "sub-math": "General Mathematics", "sub-phy": "Physics" };

const BASE_DETAILED = [
  {
    questionId: "q-1",
    body: "Q1",
    submittedOptionId: "opt-b",
    correctOptionId: "opt-b",
    isCorrect: true,
    isAttempted: true,
    marksAwarded: 1.0,
    maxMarks: 1.0,
    negativeMarks: 0.25,
    topicTags: ["Algebra"],
    sectionId: null,
    explanation: "x=3",
    options: [{ id: "opt-a", label: "A", text: "2" }, { id: "opt-b", label: "B", text: "3" }],
    sourceReference: { sourceType: "original_source", pageNumber: 1 },
    reviewStatus: "verified",
    isAiGenerated: false,
    needsVerification: false,
    difficulty: "easy",
  },
  {
    questionId: "q-2",
    body: "Q2",
    submittedOptionId: "opt-a",
    correctOptionId: "opt-b",
    isCorrect: false,
    isAttempted: true,
    marksAwarded: -0.25,
    maxMarks: 1.0,
    negativeMarks: 0.25,
    topicTags: ["Algebra"],
    sectionId: null,
    explanation: "y=2",
    options: [{ id: "opt-a", label: "A", text: "1" }, { id: "opt-b", label: "B", text: "2" }],
    sourceReference: { sourceType: "original_source", pageNumber: 2 },
    reviewStatus: "verified",
    isAiGenerated: false,
    needsVerification: false,
    difficulty: "medium",
  },
  {
    questionId: "q-3",
    body: "Q3",
    submittedOptionId: null,
    correctOptionId: "opt-a",
    isCorrect: false,
    isAttempted: false,
    marksAwarded: 0,
    maxMarks: 1.0,
    negativeMarks: 0.0,
    topicTags: ["Geometry"],
    sectionId: null,
    explanation: "z=4",
    options: [{ id: "opt-a", label: "A", text: "4" }, { id: "opt-b", label: "B", text: "5" }],
    sourceReference: { sourceType: "original_source", pageNumber: 3 },
    reviewStatus: "verified",
    isAiGenerated: false,
    needsVerification: false,
    difficulty: "hard",
  },
];

function makeAttempt(overrides: Partial<RawAttemptRecord> = {}): RawAttemptRecord {
  return {
    id: "att-1",
    snapshot_id: "snap-1",
    student_id: "stu-1",
    status: "submitted",
    score: 67,
    marks_obtained: 0.75,
    max_marks: 3.0,
    accuracy: 50,
    correct_count: 1,
    incorrect_count: 1,
    unanswered_count: 1,
    time_spent_seconds: 300,
    attempt_number: 1,
    submitted_at: "2026-10-28T10:00:00Z",
    detailed_results: BASE_DETAILED,
    topic_scores: {},
    section_scores: {},
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<RawSnapshotRecord> = {}): RawSnapshotRecord {
  return {
    id: "snap-1",
    title: "Math Diagnostic",
    subject_id: "sub-math",
    mode: "generate_practice",
    total_questions: 3,
    ...overrides,
  };
}

describe("Analytics Engine", () => {
  describe("buildExamHistory", () => {
    it("returns empty array when no finalized attempts exist", () => {
      const result = buildExamHistory(
        [makeAttempt({ score: null, submitted_at: null })],
        new Map([["snap-1", makeSnapshot()]]),
        SUBJECT_MAP
      );
      expect(result).toHaveLength(0);
    });

    it("enriches attempt with avgSecondsPerQuestion and negativeMarksLost", () => {
      const result = buildExamHistory(
        [makeAttempt()],
        new Map([["snap-1", makeSnapshot()]]),
        SUBJECT_MAP
      );
      expect(result).toHaveLength(1);
      expect(result[0].avgSecondsPerQuestion).toBe(100); // 300s / 3 questions
      expect(result[0].negativeMarksLost).toBe(0.25);    // abs(-0.25)
      expect(result[0].subjectName).toBe("General Mathematics");
    });

    it("sorts by most recent submission first", () => {
      const older = makeAttempt({ id: "att-old", submitted_at: "2026-10-25T10:00:00Z" });
      const newer = makeAttempt({ id: "att-new", submitted_at: "2026-10-29T10:00:00Z" });
      const result = buildExamHistory(
        [older, newer],
        new Map([["snap-1", makeSnapshot()]]),
        SUBJECT_MAP
      );
      expect(result[0].attemptId).toBe("att-new");
      expect(result[1].attemptId).toBe("att-old");
    });
  });

  describe("computeTopicAnalytics", () => {
    it("returns empty array when no attempts have detailed results", () => {
      const att = makeAttempt({ detailed_results: [] });
      const result = computeTopicAnalytics([], [att]);
      expect(result).toHaveLength(0);
    });

    it("flags topic as low sample when fewer than MIN_RELIABLE_SAMPLE questions", () => {
      const att = makeAttempt();
      const result = computeTopicAnalytics(
        buildExamHistory([att], new Map([["snap-1", makeSnapshot()]]), SUBJECT_MAP),
        [att]
      );
      const algebra = result.find((t) => t.topic === "Algebra");
      expect(algebra).toBeDefined();
      expect(algebra!.totalQuestions).toBe(2); // < 5
      expect(algebra!.isLowSample).toBe(true);
    });

    it("does not flag topic as low sample when >= MIN_RELIABLE_SAMPLE questions", () => {
      // Build an attempt with 6 questions all on same topic
      const manyResults = Array.from({ length: MIN_RELIABLE_SAMPLE + 1 }, (_, i) => ({
        ...BASE_DETAILED[0],
        questionId: `q-${i}`,
        topicTags: ["Trigonometry"],
      }));
      const att = makeAttempt({ detailed_results: manyResults, id: "att-many" });
      const result = computeTopicAnalytics(
        buildExamHistory([att], new Map([["snap-1", makeSnapshot()]]), SUBJECT_MAP),
        [att]
      );
      const trig = result.find((t) => t.topic === "Trigonometry");
      expect(trig!.isLowSample).toBe(false);
    });

    it("computes accuracy as correct / attempted (excludes unanswered)", () => {
      const att = makeAttempt();
      const result = computeTopicAnalytics(
        buildExamHistory([att], new Map([["snap-1", makeSnapshot()]]), SUBJECT_MAP),
        [att]
      );
      // Algebra: q-1 correct, q-2 incorrect — 1/2 attempted = 50%
      const algebra = result.find((t) => t.topic === "Algebra");
      expect(algebra!.accuracy).toBe(50);
    });

    it("aggregates topics across repeated attempts for same snapshot", () => {
      const att1 = makeAttempt({ id: "a1", submitted_at: "2026-10-28T10:00:00Z" });
      const att2 = makeAttempt({ id: "a2", submitted_at: "2026-10-29T10:00:00Z" });
      const snaps = new Map([["snap-1", makeSnapshot()]]);
      const history = buildExamHistory([att1, att2], snaps, SUBJECT_MAP);
      const result = computeTopicAnalytics(history, [att1, att2]);
      // Algebra appears in both attempts: 2*2 = 4 total questions
      const algebra = result.find((t) => t.topic === "Algebra");
      expect(algebra!.totalQuestions).toBe(4);
      expect(algebra!.examCount).toBe(2);
    });

    it("assigns General tag to questions with missing topicTags", () => {
      const att = makeAttempt({
        detailed_results: [{ ...BASE_DETAILED[0], topicTags: [] }],
      });
      const result = computeTopicAnalytics([], [att]);
      const general = result.find((t) => t.topic === "General");
      expect(general).toBeDefined();
    });
  });

  describe("computeDifficultyBreakdown", () => {
    it("correctly tallies easy/medium/hard question accuracy", () => {
      const att = makeAttempt();
      const result = computeDifficultyBreakdown([att]);
      expect(result.easy.total).toBe(1);
      expect(result.easy.correct).toBe(1);
      expect(result.easy.accuracy).toBe(100);
      expect(result.medium.total).toBe(1);
      expect(result.medium.correct).toBe(0);
      expect(result.medium.accuracy).toBe(0);
      expect(result.hard.total).toBe(1);
      expect(result.hard.correct).toBe(0);
      expect(result.hard.accuracy).toBe(0);
    });

    it("returns zero accuracy for all buckets when no attempts", () => {
      const result = computeDifficultyBreakdown([]);
      expect(result.easy.accuracy).toBe(0);
      expect(result.medium.accuracy).toBe(0);
      expect(result.hard.accuracy).toBe(0);
    });
  });

  describe("computeScoreTrend", () => {
    it("marks trend as insufficient when fewer than MIN_TREND_EXAMS exams", () => {
      const rows = [
        { attemptId: "a1", score: 60, accuracy: 55, submittedAt: "2026-10-01T00:00:00Z" },
        { attemptId: "a2", score: 70, accuracy: 65, submittedAt: "2026-10-02T00:00:00Z" },
      ] as Parameters<typeof computeScoreTrend>[0];
      const { trendSufficient } = computeScoreTrend(rows);
      expect(trendSufficient).toBe(false);
    });

    it("marks trend as sufficient when >= MIN_TREND_EXAMS exams", () => {
      const rows = Array.from({ length: MIN_TREND_EXAMS }, (_, i) => ({
        attemptId: `a${i}`,
        score: 60 + i * 5,
        accuracy: 55 + i * 3,
        submittedAt: `2026-10-0${i + 1}T00:00:00Z`,
      })) as Parameters<typeof computeScoreTrend>[0];
      const { trendSufficient, points } = computeScoreTrend(rows);
      expect(trendSufficient).toBe(true);
      expect(points).toHaveLength(MIN_TREND_EXAMS);
    });
  });

  describe("buildAnalyticsDashboard", () => {
    it("returns hasData=false and zeroed payload when student has no finalized attempts", () => {
      const payload = buildAnalyticsDashboard(
        "stu-1",
        [makeAttempt({ score: null, submitted_at: null })],
        new Map([["snap-1", makeSnapshot()]]),
        SUBJECT_MAP
      );
      expect(payload.hasData).toBe(false);
      expect(payload.totalExams).toBe(0);
      expect(payload.examHistory).toHaveLength(0);
      expect(payload.topicAnalytics).toHaveLength(0);
    });

    it("computes correct skipRate across all attempts", () => {
      // 1 unanswered out of 3 total questions = 33%
      const payload = buildAnalyticsDashboard(
        "stu-1",
        [makeAttempt()],
        new Map([["snap-1", makeSnapshot()]]),
        SUBJECT_MAP
      );
      expect(payload.hasData).toBe(true);
      expect(payload.skipRate).toBe(33);
    });

    it("computes negativeMarkImpact as total marks lost to penalties", () => {
      const payload = buildAnalyticsDashboard(
        "stu-1",
        [makeAttempt()],
        new Map([["snap-1", makeSnapshot()]]),
        SUBJECT_MAP
      );
      expect(payload.negativeMarkImpact).toBe(0.25);
    });

    it("aggregates correctly across multiple different exams", () => {
      const att2 = makeAttempt({ id: "att-2", snapshot_id: "snap-2", score: 80, submitted_at: "2026-10-29T10:00:00Z", attempt_number: 2 });
      const snaps = new Map([
        ["snap-1", makeSnapshot({ id: "snap-1" })],
        ["snap-2", makeSnapshot({ id: "snap-2", title: "Physics Exam", subject_id: "sub-phy" })],
      ]);
      const payload = buildAnalyticsDashboard("stu-1", [makeAttempt(), att2], snaps, SUBJECT_MAP);
      expect(payload.totalExams).toBe(2);
      expect(payload.subjectBreakdowns.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("computeSubjectBreakdowns", () => {
    it("returns insufficient_data trend when fewer than MIN_TREND_EXAMS", () => {
      const history = buildExamHistory([makeAttempt()], new Map([["snap-1", makeSnapshot()]]), SUBJECT_MAP);
      const breakdowns = computeSubjectBreakdowns(history, SUBJECT_MAP);
      expect(breakdowns).toHaveLength(1);
      expect(breakdowns[0].scoreTrend).toBe("insufficient_data");
    });

    it("detects improving trend when subsequent exams have higher average scores", () => {
      const attempts = [
        makeAttempt({ id: "att-1", score: 50, submitted_at: "2026-10-01T10:00:00Z" }),
        makeAttempt({ id: "att-2", score: 55, submitted_at: "2026-10-05T10:00:00Z" }),
        makeAttempt({ id: "att-3", score: 80, submitted_at: "2026-10-10T10:00:00Z" }),
        makeAttempt({ id: "att-4", score: 90, submitted_at: "2026-10-15T10:00:00Z" }),
      ];
      const history = buildExamHistory(attempts, new Map([["snap-1", makeSnapshot()]]), SUBJECT_MAP);
      const breakdowns = computeSubjectBreakdowns(history, SUBJECT_MAP);
      expect(breakdowns[0].scoreTrend).toBe("improving");
    });
  });

  describe("computeMistakeDiagnosis (Why am I making mistakes?)", () => {
    it("detects penalty guessing when negativeMarkImpact > 0", () => {
      const diagnosis = computeMistakeDiagnosis(
        [],
        [],
        { easy: { total: 5, correct: 4, accuracy: 80 }, medium: { total: 5, correct: 3, accuracy: 60 }, hard: { total: 5, correct: 3, accuracy: 60 } },
        5,
        1.5, // 1.5 marks lost to penalties
        15,
        900
      );
      expect(diagnosis.negativeMarkPenalty.detected).toBe(true);
      expect(diagnosis.negativeMarkPenalty.marksLost).toBe(1.5);
      expect(diagnosis.primaryFactors.some((f) => f.type === "penalty_guessing")).toBe(true);
    });

    it("detects time pressure when skipRate is high (>12%)", () => {
      const diagnosis = computeMistakeDiagnosis(
        [],
        [],
        { easy: { total: 5, correct: 4, accuracy: 80 }, medium: { total: 5, correct: 3, accuracy: 60 }, hard: { total: 5, correct: 3, accuracy: 60 } },
        20, // 20% skip rate
        0,
        15,
        900
      );
      expect(diagnosis.timePressure.detected).toBe(true);
      expect(diagnosis.primaryFactors.some((f) => f.type === "time_pressure")).toBe(true);
    });

    it("detects difficulty cliff when easy accuracy is high but hard accuracy is low", () => {
      const diagnosis = computeMistakeDiagnosis(
        [],
        [],
        { easy: { total: 10, correct: 9, accuracy: 90 }, medium: { total: 5, correct: 3, accuracy: 60 }, hard: { total: 5, correct: 1, accuracy: 20 } },
        0,
        0,
        20,
        1200
      );
      expect(diagnosis.difficultyCliff.detected).toBe(true);
      expect(diagnosis.primaryFactors.some((f) => f.type === "difficulty_cliff")).toBe(true);
    });
  });

  describe("computeFiveQuestionsDiagnostic (The 5 Core Questions)", () => {
    it("answers all five diagnostic questions with evidence-based data", () => {
      const history = buildExamHistory([makeAttempt()], new Map([["snap-1", makeSnapshot()]]), SUBJECT_MAP);
      const topicAnalytics = computeTopicAnalytics(history, [makeAttempt()]);
      const difficulty = computeDifficultyBreakdown([makeAttempt()]);
      const trend = [{ attemptId: "att-1", label: "Attempt 1", score: 67, accuracy: 50, submittedAt: "2026-10-28T10:00:00Z" }];

      const fiveQ = computeFiveQuestionsDiagnostic(
        history,
        topicAnalytics,
        difficulty,
        trend,
        false, // 1 exam => trendSufficient = false
        33,
        0.25,
        3,
        300
      );

      // 1. What am I good at?
      expect(fiveQ.whatAmIGoodAt.summary).toBeDefined();

      // 2. Where am I losing marks?
      expect(fiveQ.whereAmILosingMarks.weakTopics).toBeDefined();
      expect(fiveQ.whereAmILosingMarks.marksLostBreakdown.penalties).toBe(0.25);

      // 3. Why am I making mistakes?
      expect(fiveQ.whyAmIMakingMistakes.negativeMarkPenalty.detected).toBe(true);
      expect(fiveQ.whyAmIMakingMistakes.timePressure.detected).toBe(true);

      // 4. How am I improving?
      expect(fiveQ.howAmIImproving.trendStatus).toBe("insufficient_data");

      // 5. What should I do next?
      expect(fiveQ.whatShouldIDoNext.recommendedAction).toBeDefined();
      expect(fiveQ.whatShouldIDoNext.actionSteps.length).toBeGreaterThan(0);
    });
  });
});

