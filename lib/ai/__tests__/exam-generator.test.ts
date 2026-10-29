import { describe, it, expect, vi } from "vitest";
import {
  verifyStudioQuestion,
  detectDuplicateQuestions,
  transformDetectedQuestions,
  buildExamQuestionsForStudio,
  validateExamConfigurationAgainstSources,
} from "../exam-generator";
import { MockAIProvider } from "../provider";
import type { StudioQuestion, ExamConfiguration } from "@/lib/schemas/exam-studio";
import type { DetectedQuestion } from "../schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

describe("Exam Generator & Verification Engine", () => {
  const sampleDetectedQuestions: DetectedQuestion[] = [
    {
      id: "dq-1",
      questionNumber: "1",
      body: "Solve the linear equation 3x + 9 = 0 for x.",
      options: [
        { label: "A", text: "x = -3" },
        { label: "B", text: "x = 3" },
        { label: "C", text: "x = 0" },
        { label: "D", text: "x = -9" },
      ],
      instructions: null,
      marks: 2,
      containsTable: false,
      containsEquation: true,
      answerKey: "A",
      isComplete: true,
      missingElements: [],
      pageNumber: 1,
    },
    {
      id: "dq-2",
      questionNumber: "2",
      body: "Which component of blood is primarily responsible for transporting oxygen?",
      options: [
        { label: "A", text: "White blood cells" },
        { label: "B", text: "Red blood cells (erythrocytes)" },
        { label: "C", text: "Blood platelets" },
        { label: "D", text: "Blood plasma" },
      ],
      instructions: null,
      marks: 2,
      containsTable: false,
      containsEquation: false,
      answerKey: null, // Missing answer key in source
      isComplete: true,
      missingElements: [],
      pageNumber: 2,
    },
  ];

  it("transforms detected source questions and preserves numbering and source tags", () => {
    const studioQuestions = transformDetectedQuestions(sampleDetectedQuestions, 2, 2.0, 0.5);

    expect(studioQuestions).toHaveLength(2);
    expect(studioQuestions[0].sourceReference.sourceType).toBe("original_source");
    expect(studioQuestions[0].sourceReference.originalQuestionNumber).toBe("1");
    expect(studioQuestions[0].marks).toBe(2.0);
    expect(studioQuestions[0].negativeMarks).toBe(0.5);
    expect(studioQuestions[0].reviewStatus).toBe("verified");

    // Question 2 lacked an explicit answer key in source text: must be flagged for manual review!
    expect(studioQuestions[1].reviewStatus).toBe("flagged_review");
    expect(studioQuestions[1].validationIssues).toContain(
      "Original question lacks explicit answer key in document. Please review."
    );
  });

  it("verifies question integrity and flags missing answer keys or duplicate options", () => {
    const validQuestion: StudioQuestion = {
      id: "q-valid",
      body: "What is the capital of Nigeria?",
      type: "single_choice",
      options: [
        { id: "opt-1", label: "A", text: "Abuja" },
        { id: "opt-2", label: "B", text: "Lagos" },
      ],
      correctOptionId: "opt-1",
      explanation: "Abuja officially replaced Lagos as the federal capital territory in 1991.",
      difficulty: "easy",
      topicTags: ["Geography"],
      marks: 1.0,
      negativeMarks: 0.0,
      sourceReference: { sourceType: "ai_generated" },
      reviewStatus: "verified",
      validationIssues: [],
      orderIndex: 0,
    };

    const validResult = verifyStudioQuestion(validQuestion);
    expect(validResult.isValid).toBe(true);
    expect(validResult.issues).toHaveLength(0);

    // Invalid question: duplicate options and non-matching correct option ID
    const invalidQuestion: StudioQuestion = {
      ...validQuestion,
      options: [
        { id: "opt-1", label: "A", text: "Abuja" },
        { id: "opt-2", label: "B", text: "Abuja" }, // Duplicate text
      ],
      correctOptionId: "non-existent-id", // Missing answer key
    };

    const invalidResult = verifyStudioQuestion(invalidQuestion);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.issues).toContain("Specified answer key does not match any valid option ID.");
    expect(invalidResult.issues.some((i) => i.includes("Duplicate option detected"))).toBe(true);
  });

  it("detects high-similarity duplicate questions across a draft batch", () => {
    const q1: StudioQuestion = {
      id: "q-1",
      body: "What is the primary function of mitochondria in biological eukaryotic cells?",
      type: "single_choice",
      options: [
        { id: "opt-1", label: "A", text: "ATP energy production" },
        { id: "opt-2", label: "B", text: "Protein synthesis" },
      ],
      correctOptionId: "opt-1",
      explanation: "Mitochondria generate ATP through oxidative phosphorylation.",
      difficulty: "medium",
      topicTags: ["Biology"],
      marks: 1.0,
      negativeMarks: 0.0,
      sourceReference: { sourceType: "ai_generated" },
      reviewStatus: "verified",
      validationIssues: [],
      orderIndex: 0,
    };

    const q2: StudioQuestion = {
      ...q1,
      id: "q-2",
      body: "What is the primary function of mitochondria in human biological eukaryotic cells?", // Near-duplicate
      orderIndex: 1,
    };

    const duplicates = detectDuplicateQuestions([q1, q2]);
    expect(duplicates.has("q-1")).toBe(true);
    expect(duplicates.get("q-1")).toContain("q-2");
  });

  it("validates configuration settings and flags warnings when requested count exceeds source questions", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "material_analyses") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "analysis-1",
                    document_id: "mat-1",
                    extracted_questions: sampleDetectedQuestions,
                    status: "completed",
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    const config: ExamConfiguration = {
      title: "Mathematics Mock 2026",
      subjectId: "11111111-1111-1111-1111-111111111111",
      mode: "recreate_source",
      materialIds: ["22222222-2222-2222-2222-222222222222"],
      topicIds: [],
      questionCount: 20, // Requesting 20 but source only has 2
      durationMinutes: 30,
      difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      marksPerQuestion: 1.0,
      negativeMarking: 0.25,
      shuffleQuestions: true,
      shuffleOptions: true,
      feedbackTiming: "after_submission",
      sections: [],
    };

    const validation = await validateExamConfigurationAgainstSources(mockSupabase, config);
    expect(validation.isValid).toBe(true);
    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(validation.warnings[0]).toContain("Requested 20 questions, but selected source materials only contain 2");
  });

  it("orchestrates generation in mixed mode blending source and AI questions", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "material_analyses") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    extracted_questions: sampleDetectedQuestions,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === "document_pages") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      { page_number: 1, extracted_text: "Curriculum text on algebraic geometry." },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    const config: ExamConfiguration = {
      title: "Mixed Exam",
      subjectId: "11111111-1111-1111-1111-111111111111",
      mode: "mixed",
      materialIds: ["22222222-2222-2222-2222-222222222222"],
      topicIds: [],
      questionCount: 3,
      durationMinutes: 30,
      difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      marksPerQuestion: 1.0,
      negativeMarking: 0.0,
      shuffleQuestions: true,
      shuffleOptions: true,
      feedbackTiming: "after_submission",
      sections: [],
    };

    const provider = new MockAIProvider();
    const studioQuestions = await buildExamQuestionsForStudio(mockSupabase, config, provider);

    expect(studioQuestions).toHaveLength(3);
    const hasOriginal = studioQuestions.some((q) => q.sourceReference.sourceType === "original_source");
    const hasAI = studioQuestions.some((q) => q.sourceReference.sourceType === "ai_generated");
    expect(hasOriginal).toBe(true);
    expect(hasAI).toBe(true);
  });
});
