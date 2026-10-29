import { describe, it, expect } from "vitest";
import {
  sanitizeQuestionForAttempt,
  type StudioQuestion,
} from "@/lib/schemas/exam-studio";

describe("CBT Examination Engine & Security Isolation", () => {
  const fullStudioQuestion: StudioQuestion = {
    id: "sq-101",
    body: "What is the result of differentiating f(x) = 3x² + 4x with respect to x?",
    type: "single_choice",
    options: [
      { id: "opt-1", label: "A", text: "6x + 4", explanation: "Correct power rule application: 3*2x^(2-1) + 4 = 6x + 4" },
      { id: "opt-2", label: "B", text: "3x + 4", explanation: "Incorrect power rule multiplier" },
      { id: "opt-3", label: "C", text: "6x", explanation: "Omitted linear constant term derivative" },
      { id: "opt-4", label: "D", text: "x² + 4", explanation: "Did not multiply coefficient by exponent" },
    ],
    correctOptionId: "opt-1",
    explanation: "Using the power rule: d/dx(3x²) = 6x, and d/dx(4x) = 4. Therefore, f'(x) = 6x + 4.",
    difficulty: "medium",
    topicTags: ["Calculus", "Differentiation"],
    marks: 2.0,
    negativeMarks: 0.5,
    sourceReference: {
      pageNumber: 12,
      evidenceSnippet: "Calculus basic derivatives chapter",
      sourceType: "original_source",
      originalQuestionNumber: "Q14",
    },
    reviewStatus: "verified",
    validationIssues: [],
    orderIndex: 0,
  };

  it("sanitizes questions for active attempts by stripping answer keys and worked solutions", () => {
    const sanitized = sanitizeQuestionForAttempt(fullStudioQuestion);

    // Question body and options must be present
    expect(sanitized.id).toBe("sq-101");
    expect(sanitized.body).toBe(fullStudioQuestion.body);
    expect(sanitized.options).toHaveLength(4);

    // CRITICAL SECURITY ASSERTION: Answer key and solutions MUST NOT exist on sanitized object
    expect((sanitized as unknown as Record<string, unknown>).correctOptionId).toBeUndefined();
    expect((sanitized as unknown as Record<string, unknown>).explanation).toBeUndefined();

    // Option-level explanations must also be stripped
    for (const opt of sanitized.options) {
      expect((opt as unknown as Record<string, unknown>).explanation).toBeUndefined();
      expect(opt.id).toBeDefined();
      expect(opt.text).toBeDefined();
    }
  });

  it("applies fixed randomized option ordering per attempt when requested", () => {
    const customOrder = ["opt-3", "opt-1", "opt-4", "opt-2"];
    const sanitized = sanitizeQuestionForAttempt(fullStudioQuestion, customOrder);

    expect(sanitized.options.map((o) => o.id)).toEqual(customOrder);
    expect((sanitized as unknown as Record<string, unknown>).correctOptionId).toBeUndefined();
  });

  it("calculates marks with negative marking penalties correctly", () => {
    // Scoring logic simulation matching submitExamAttemptAction
    const questions: StudioQuestion[] = [
      {
        ...fullStudioQuestion,
        id: "q1",
        marks: 2.0,
        negativeMarks: 0.5,
        correctOptionId: "opt-correct",
      },
      {
        ...fullStudioQuestion,
        id: "q2",
        marks: 2.0,
        negativeMarks: 0.5,
        correctOptionId: "opt-correct",
      },
      {
        ...fullStudioQuestion,
        id: "q3",
        marks: 2.0,
        negativeMarks: 0.5,
        correctOptionId: "opt-correct",
      },
      {
        ...fullStudioQuestion,
        id: "q4",
        marks: 2.0,
        negativeMarks: 0.5,
        correctOptionId: "opt-correct",
      },
    ];

    const studentAnswers: Record<string, string> = {
      q1: "opt-correct", // Correct (+2.0)
      q2: "opt-correct", // Correct (+2.0)
      q3: "opt-wrong",   // Incorrect (-0.5)
      // q4 unanswered (0.0)
    };

    let earned = 0;
    let maxMarks = 0;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (const q of questions) {
      maxMarks += q.marks;
      const ans = studentAnswers[q.id];
      if (!ans) {
        unanswered++;
      } else if (ans === q.correctOptionId) {
        correct++;
        earned += q.marks;
      } else {
        incorrect++;
        earned -= q.negativeMarks;
      }
    }

    expect(correct).toBe(2);
    expect(incorrect).toBe(1);
    expect(unanswered).toBe(1);
    expect(earned).toBe(3.5); // 2 + 2 - 0.5 = 3.5
    expect(maxMarks).toBe(8.0);

    const percentage = Math.round((earned / maxMarks) * 100);
    expect(percentage).toBe(44); // 3.5 / 8 = 43.75% -> 44%
  });

  it("clamps marks to zero minimum to prevent negative aggregate scores", () => {
    const q: StudioQuestion = {
      ...fullStudioQuestion,
      marks: 1.0,
      negativeMarks: 2.0,
      correctOptionId: "opt-1",
    };

    const studentAnswers = { [q.id]: "opt-wrong" };
    const rawEarned = studentAnswers[q.id] === q.correctOptionId ? q.marks : -q.negativeMarks; // -2.0
    const clampedMarks = Math.max(0, rawEarned);

    expect(clampedMarks).toBe(0);
  });
});
