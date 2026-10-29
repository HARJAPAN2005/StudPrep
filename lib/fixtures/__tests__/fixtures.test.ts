import { describe, it, expect } from "vitest";
import {
  MOCK_SUBJECTS,
  MOCK_MATERIALS,
  MOCK_STUDENT_STATS,
  MOCK_EXAM_SESSION,
} from "../mock-data";

describe("Mock Data Fixtures", () => {
  it("provides valid subjects with questions and material counts", () => {
    expect(MOCK_SUBJECTS.length).toBeGreaterThan(0);
    const eng = MOCK_SUBJECTS.find((s) => s.code === "ENG-101");
    expect(eng).toBeDefined();
    expect(eng?.name).toBe("Use of English");
    expect(eng?.questionCount).toBeGreaterThan(100);
  });

  it("provides valid study materials with topic extraction and ready status", () => {
    expect(MOCK_MATERIALS.length).toBeGreaterThan(0);
    const ready = MOCK_MATERIALS.filter((m) => m.status === "ready");
    expect(ready.length).toBeGreaterThan(0);
    ready.forEach((mat) => {
      expect(mat.keyTopics.length).toBeGreaterThan(0);
      expect(mat.generatedQuestionsCount).toBeGreaterThan(0);
    });
  });

  it("provides student progress and score progression data", () => {
    expect(MOCK_STUDENT_STATS.averageScorePercentage).toBeGreaterThanOrEqual(0);
    expect(MOCK_STUDENT_STATS.averageScorePercentage).toBeLessThanOrEqual(100);
    expect(MOCK_STUDENT_STATS.recentExams.length).toBeGreaterThan(0);
    expect(MOCK_STUDENT_STATS.scoreProgression.length).toBeGreaterThan(0);
  });

  it("provides a valid CBT exam session with questions and options", () => {
    expect(MOCK_EXAM_SESSION.questions.length).toBe(MOCK_EXAM_SESSION.totalQuestions);
    MOCK_EXAM_SESSION.questions.forEach((q) => {
      expect(q.options.length).toBe(4);
      expect(q.correctOptionId).toBeDefined();
      expect(q.explanation.length).toBeGreaterThan(10);
    });
  });
});
