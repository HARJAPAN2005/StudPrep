import { describe, it, expect } from "vitest";
import {
  evaluateObjectiveQuestion,
  calculateMasteryLevel,
  gradeExamAttempt,
  calculateHistoricalComparison,
} from "../grading-service";
import type { StudioQuestion, ExamSection } from "@/lib/schemas/exam-studio";

const MOCK_QUESTIONS: StudioQuestion[] = [
  {
    id: "q-1",
    body: "What is the capital of Nigeria?",
    type: "single_choice",
    options: [
      { id: "opt-a", label: "A", text: "Lagos", explanation: "Lagos was former capital until 1991." },
      { id: "opt-b", label: "B", text: "Abuja", explanation: "Abuja is the federal capital territory." },
      { id: "opt-c", label: "C", text: "Kano", explanation: "Kano is a commercial center." },
      { id: "opt-d", label: "D", text: "Ibadan", explanation: "Ibadan is in Oyo state." },
    ],
    correctOptionId: "opt-b",
    explanation: "Abuja became the official capital of Nigeria on December 12, 1991.",
    difficulty: "easy",
    topicTags: ["Geography", "Government"],
    marks: 2.0,
    negativeMarks: 0.5,
    sourceReference: {
      sourceType: "original_source",
      pageNumber: 12,
      evidenceSnippet: "Abuja was declared capital...",
    },
    reviewStatus: "verified",
    validationIssues: [],
    orderIndex: 0,
    sectionId: "sec-geo",
  },
  {
    id: "q-2",
    body: "Photosynthesis takes place primarily in the mitochondria. True or False?",
    type: "true_false",
    options: [
      { id: "opt-t", label: "True", text: "True", explanation: "Mitochondria handles respiration, not photosynthesis." },
      { id: "opt-f", label: "False", text: "False", explanation: "Photosynthesis occurs in chloroplasts." },
    ],
    correctOptionId: "opt-f",
    explanation: "Photosynthesis occurs in chloroplasts containing chlorophyll.",
    difficulty: "easy",
    topicTags: ["Biology"],
    marks: 1.0,
    negativeMarks: 0.25,
    sourceReference: {
      sourceType: "ai_generated",
      pageNumber: 45,
    },
    reviewStatus: "flagged_review",
    validationIssues: ["Needs syllabus verification"],
    orderIndex: 1,
    sectionId: "sec-bio",
  },
  {
    id: "q-3",
    body: "Which organelle synthesizes ATP during aerobic cellular respiration?",
    type: "single_choice",
    options: [
      { id: "opt-1", label: "A", text: "Ribosome" },
      { id: "opt-2", label: "B", text: "Mitochondria" },
      { id: "opt-3", label: "C", text: "Golgi Apparatus" },
      { id: "opt-4", label: "D", text: "Endoplasmic Reticulum" },
    ],
    correctOptionId: "opt-2",
    explanation: "Mitochondria produces ATP via the citric acid cycle and oxidative phosphorylation.",
    difficulty: "medium",
    topicTags: ["Biology", "Cell Biology"],
    marks: 1.0,
    negativeMarks: 0.0,
    sourceReference: {
      sourceType: "original_source",
      pageNumber: 88,
    },
    reviewStatus: "verified",
    validationIssues: [],
    orderIndex: 2,
    sectionId: "sec-bio",
  },
  {
    id: "q-4",
    body: "What is the acceleration due to gravity on Earth's surface?",
    type: "single_choice",
    options: [
      { id: "opt-w", label: "A", text: "9.8 m/s^2" },
      { id: "opt-x", label: "B", text: "8.9 m/s^2" },
      { id: "opt-y", label: "C", text: "10.8 m/s^2" },
      { id: "opt-z", label: "D", text: "1.6 m/s^2" },
    ],
    correctOptionId: "opt-w",
    explanation: "Standard acceleration due to Earth's gravity is approximately 9.8 m/s^2.",
    difficulty: "medium",
    topicTags: ["Physics"],
    marks: 2.0,
    negativeMarks: 1.0,
    sourceReference: {
      sourceType: "original_source",
      pageNumber: 104,
    },
    reviewStatus: "verified",
    validationIssues: [],
    orderIndex: 3,
    sectionId: null, // General / no section
  },
];

const MOCK_SECTIONS: ExamSection[] = [
  { id: "sec-geo", title: "Social Studies & Geography" },
  { id: "sec-bio", title: "Biological Sciences" },
];

describe("Deterministic Server-Side Grading Engine", () => {
  describe("Individual Objective Question Evaluation", () => {
    it("awards positive marks for correct answer with case-insensitive option matching", () => {
      const res = evaluateObjectiveQuestion({
        question: MOCK_QUESTIONS[0],
        submittedOptionId: "OPT-B",
        sectionTitle: "Social Studies & Geography",
      });

      expect(res.isAttempted).toBe(true);
      expect(res.isCorrect).toBe(true);
      expect(res.marksAwarded).toBe(2.0);
      expect(res.maxMarks).toBe(2.0);
      expect(res.isAiGenerated).toBe(false);
      expect(res.needsVerification).toBe(false);
    });

    it("deducts negative penalty marks for incorrect answer", () => {
      const res = evaluateObjectiveQuestion({
        question: MOCK_QUESTIONS[0],
        submittedOptionId: "opt-a",
        sectionTitle: "Social Studies & Geography",
      });

      expect(res.isAttempted).toBe(true);
      expect(res.isCorrect).toBe(false);
      expect(res.marksAwarded).toBe(-0.5);
    });

    it("awards zero marks and no penalty for unanswered question", () => {
      const resNull = evaluateObjectiveQuestion({
        question: MOCK_QUESTIONS[0],
        submittedOptionId: null,
      });
      expect(resNull.isAttempted).toBe(false);
      expect(resNull.isCorrect).toBe(false);
      expect(resNull.marksAwarded).toBe(0);
      expect(resNull.submittedOptionId).toBeNull();

      const resEmpty = evaluateObjectiveQuestion({
        question: MOCK_QUESTIONS[0],
        submittedOptionId: "   ",
      });
      expect(resEmpty.isAttempted).toBe(false);
      expect(resEmpty.marksAwarded).toBe(0);
    });

    it("flags question as needing verification if AI-generated and flagged for review", () => {
      const res = evaluateObjectiveQuestion({
        question: MOCK_QUESTIONS[1],
        submittedOptionId: "opt-f",
      });

      expect(res.isCorrect).toBe(true);
      expect(res.isAiGenerated).toBe(true);
      expect(res.needsVerification).toBe(true);
    });
  });

  describe("Topic Mastery Level Calculation", () => {
    it("classifies >= 75% as mastered", () => {
      expect(calculateMasteryLevel(75)).toBe("mastered");
      expect(calculateMasteryLevel(100)).toBe("mastered");
    });

    it("classifies >= 50% and < 75% as competent", () => {
      expect(calculateMasteryLevel(50)).toBe("competent");
      expect(calculateMasteryLevel(74)).toBe("competent");
    });

    it("classifies < 50% as needs_review", () => {
      expect(calculateMasteryLevel(49)).toBe("needs_review");
      expect(calculateMasteryLevel(0)).toBe("needs_review");
    });
  });

  describe("Complete Exam Grading", () => {
    it("grades 100% when all answers are correct", () => {
      const answers = {
        "q-1": "opt-b",
        "q-2": "opt-f",
        "q-3": "opt-2",
        "q-4": "opt-w",
      };

      const result = gradeExamAttempt(MOCK_QUESTIONS, answers, {
        negativeMarking: 0.25,
        sections: MOCK_SECTIONS,
      });

      expect(result.totalQuestions).toBe(4);
      expect(result.attemptedCount).toBe(4);
      expect(result.correctCount).toBe(4);
      expect(result.incorrectCount).toBe(0);
      expect(result.unansweredCount).toBe(0);
      expect(result.maxMarks).toBe(6.0); // 2 + 1 + 1 + 2
      expect(result.marksObtained).toBe(6.0);
      expect(result.score).toBe(100);
      expect(result.accuracy).toBe(100);

      // Section scores
      expect(result.sectionScores["sec-geo"].percentage).toBe(100);
      expect(result.sectionScores["sec-bio"].percentage).toBe(100);
      expect(result.sectionScores["general"].percentage).toBe(100);

      // Topic scores
      expect(result.topicScores["Geography"].masteryLevel).toBe("mastered");
      expect(result.topicScores["Biology"].masteryLevel).toBe("mastered");
      expect(result.topicScores["Physics"].masteryLevel).toBe("mastered");
    });

    it("clamps marks obtained to 0 when negative marks exceed positive marks", () => {
      // Answer all questions incorrectly with heavy penalties
      const answers = {
        "q-1": "opt-a", // -0.5
        "q-2": "opt-t", // -0.25
        "q-3": "opt-1", // 0
        "q-4": "opt-x", // -1.0
      };

      const result = gradeExamAttempt(MOCK_QUESTIONS, answers, {
        negativeMarking: 0.5,
        sections: MOCK_SECTIONS,
      });

      expect(result.correctCount).toBe(0);
      expect(result.incorrectCount).toBe(4);
      expect(result.unansweredCount).toBe(0);
      // Raw sum would be -1.75, clamped to 0
      expect(result.marksObtained).toBe(0);
      expect(result.score).toBe(0);
      expect(result.accuracy).toBe(0);
      expect(result.topicScores["Physics"].marksObtained).toBe(0);
      expect(result.topicScores["Physics"].masteryLevel).toBe("needs_review");
    });

    it("accurately handles mixed answered, incorrect, and unanswered questions", () => {
      const answers = {
        "q-1": "opt-b", // Correct (+2.0)
        "q-2": "opt-t", // Incorrect (-0.25)
        // q-3 unanswered (0)
        "q-4": "opt-w", // Correct (+2.0)
      };

      const result = gradeExamAttempt(MOCK_QUESTIONS, answers, {
        negativeMarking: 0.25,
        sections: MOCK_SECTIONS,
      });

      expect(result.correctCount).toBe(2);
      expect(result.incorrectCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
      expect(result.attemptedCount).toBe(3);

      // Marks: 2.0 - 0.25 + 0 + 2.0 = 3.75 out of 6.0 = 62.5% -> round 63%
      expect(result.marksObtained).toBe(3.75);
      expect(result.maxMarks).toBe(6.0);
      expect(result.score).toBe(63);
      // Accuracy: 2 correct / 3 attempted = 66.67% -> 67%
      expect(result.accuracy).toBe(67);
    });

    it("correctly aggregates topics shared across multiple questions", () => {
      const answers = {
        "q-1": "opt-b", // Geo (corr)
        "q-2": "opt-f", // Bio (corr, +1.0)
        "q-3": "opt-2", // Bio & Cell Biology (corr, +1.0)
        "q-4": "opt-w", // Physics (corr)
      };

      const result = gradeExamAttempt(MOCK_QUESTIONS, answers, {
        negativeMarking: 0.0,
        sections: MOCK_SECTIONS,
      });

      // Bio was in q-2 and q-3. Total max marks = 1.0 + 1.0 = 2.0. Marks obtained = 2.0
      expect(result.topicScores["Biology"].maxMarks).toBe(2.0);
      expect(result.topicScores["Biology"].marksObtained).toBe(2.0);
      expect(result.topicScores["Biology"].percentage).toBe(100);
      expect(result.topicScores["Biology"].masteryLevel).toBe("mastered");
    });
  });

  describe("Historical Comparison Analytics", () => {
    it("designates as baseline attempt when candidate has no prior attempts", () => {
      const comparison = calculateHistoricalComparison(82, []);

      expect(comparison.isBaseline).toBe(true);
      expect(comparison.previousScore).toBeNull();
      expect(comparison.scoreDelta).toBeNull();
      expect(comparison.previousAttemptsCount).toBe(0);
      expect(comparison.bestScore).toBe(82);
      expect(comparison.averageScore).toBe(82);
    });

    it("computes authentic delta and averages when prior attempts exist", () => {
      const priors = [
        { id: "a-1", score: 60, submittedAt: "2026-10-28T10:00:00Z" },
        { id: "a-2", score: 75, submittedAt: "2026-10-29T14:00:00Z" }, // most recent prior
      ];

      const comparison = calculateHistoricalComparison(85, priors);

      expect(comparison.isBaseline).toBe(false);
      expect(comparison.previousScore).toBe(75);
      expect(comparison.scoreDelta).toBe(10); // 85 - 75
      expect(comparison.previousAttemptsCount).toBe(2);
      expect(comparison.bestScore).toBe(85);
      // Average of 85, 75, 60 = 220 / 3 = 73.33 -> 73
      expect(comparison.averageScore).toBe(73);
    });

    it("filters out incomplete or unsubmitted prior attempts", () => {
      const priors = [
        { id: "a-active", score: null, submittedAt: null },
        { id: "a-1", score: 70, submittedAt: "2026-10-29T12:00:00Z" },
      ];

      const comparison = calculateHistoricalComparison(65, priors);

      expect(comparison.isBaseline).toBe(false);
      expect(comparison.previousScore).toBe(70);
      expect(comparison.scoreDelta).toBe(-5); // 65 - 70
      expect(comparison.previousAttemptsCount).toBe(1);
    });
  });
});

