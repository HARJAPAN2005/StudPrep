import { describe, it, expect } from "vitest";
import {
  GeneratedQuestionSchema,
  GeneratedQuestionsResponseSchema,
  CreateQuestionSchema,
} from "../question";

const validQuestion = {
  body: "What is the capital of Nigeria?",
  options: ["Lagos", "Abuja", "Kano", "Ibadan"],
  correct_index: 1,
  explanation:
    "Abuja became the capital of Nigeria in 1991, replacing Lagos which had been the de facto capital.",
  difficulty: "easy" as const,
};

describe("GeneratedQuestionSchema", () => {
  it("validates a valid question", () => {
    const result = GeneratedQuestionSchema.safeParse(validQuestion);
    expect(result.success).toBe(true);
  });

  it("rejects a question body that is too short", () => {
    const result = GeneratedQuestionSchema.safeParse({
      ...validQuestion,
      body: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects options that are not exactly 4", () => {
    const result = GeneratedQuestionSchema.safeParse({
      ...validQuestion,
      options: ["A", "B", "C"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects correct_index out of range", () => {
    const result = GeneratedQuestionSchema.safeParse({
      ...validQuestion,
      correct_index: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid difficulty", () => {
    const result = GeneratedQuestionSchema.safeParse({
      ...validQuestion,
      difficulty: "very-hard",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid difficulty values", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const result = GeneratedQuestionSchema.safeParse({
        ...validQuestion,
        difficulty,
      });
      expect(result.success).toBe(true);
    }
  });

  it("allows source_page to be null", () => {
    const result = GeneratedQuestionSchema.safeParse({
      ...validQuestion,
      source_page: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("GeneratedQuestionsResponseSchema", () => {
  it("validates a response with multiple questions", () => {
    const result = GeneratedQuestionsResponseSchema.safeParse({
      questions: [validQuestion, { ...validQuestion, difficulty: "hard" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty questions array", () => {
    const result = GeneratedQuestionsResponseSchema.safeParse({
      questions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 50 questions", () => {
    const result = GeneratedQuestionsResponseSchema.safeParse({
      questions: Array(51).fill(validQuestion),
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateQuestionSchema", () => {
  it("requires a valid UUID for subject_id", () => {
    const result = CreateQuestionSchema.safeParse({
      ...validQuestion,
      subject_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid UUID for subject_id", () => {
    const result = CreateQuestionSchema.safeParse({
      ...validQuestion,
      subject_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});

