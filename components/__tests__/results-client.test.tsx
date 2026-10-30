import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResultsClient } from "@/app/(exam)/exam/[id]/results/results-client";
import type { DetailedExamReviewPayload } from "@/app/actions/grading";
import * as gradingActions from "@/app/actions/grading";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const MOCK_PAYLOAD: DetailedExamReviewPayload = {
  attemptId: "11111111-1111-1111-1111-111111111111",
  snapshotId: "22222222-2222-2222-2222-222222222222",
  title: "JAMB Mathematics Diagnostic 2026",
  subjectId: "math-001",
  attemptNumber: 2,
  status: "submitted",
  submittedAt: "2026-10-30T10:30:00Z",
  timeSpentSeconds: 180,
  comparison: {
    isBaseline: false,
    previousScore: 60,
    scoreDelta: 20,
    previousAttemptsCount: 1,
    bestScore: 80,
    averageScore: 70,
  },
  grading: {
    score: 80,
    marksObtained: 4.0,
    maxMarks: 5.0,
    accuracy: 80,
    correctCount: 4,
    incorrectCount: 1,
    unansweredCount: 0,
    totalQuestions: 5,
    attemptedCount: 5,
    sectionScores: {
      "sec-1": {
        sectionId: "sec-1",
        title: "Algebra & Calculus",
        marksObtained: 4.0,
        maxMarks: 5.0,
        correctCount: 4,
        incorrectCount: 1,
        unansweredCount: 0,
        accuracy: 80,
        percentage: 80,
      },
    },
    topicScores: {
      Algebra: {
        topic: "Algebra",
        marksObtained: 4.0,
        maxMarks: 5.0,
        correctCount: 4,
        incorrectCount: 1,
        unansweredCount: 0,
        accuracy: 80,
        percentage: 80,
        masteryLevel: "mastered",
      },
    },
    detailedResults: [
      {
        questionId: "q-1",
        body: "What is 2x + 4 = 10?",
        submittedOptionId: "opt-b",
        correctOptionId: "opt-b",
        isCorrect: true,
        isAttempted: true,
        marksAwarded: 1.0,
        maxMarks: 1.0,
        negativeMarks: 0.25,
        sectionId: "sec-1",
        sectionTitle: "Algebra & Calculus",
        topicTags: ["Algebra"],
        explanation: "Subtract 4 from both sides: 2x = 6, hence x = 3.",
        options: [
          { id: "opt-a", label: "A", text: "x = 2" },
          { id: "opt-b", label: "B", text: "x = 3" },
        ],
        sourceReference: {
          pageNumber: 14,
          sourceType: "original_source",
          evidenceSnippet: "Linear equations chapter 2",
        },
        reviewStatus: "verified",
        isAiGenerated: false,
        needsVerification: false,
      },
      {
        questionId: "q-2",
        body: "Is 7 a prime number?",
        submittedOptionId: "opt-no",
        correctOptionId: "opt-yes",
        isCorrect: false,
        isAttempted: true,
        marksAwarded: -0.25,
        maxMarks: 1.0,
        negativeMarks: 0.25,
        sectionId: "sec-1",
        sectionTitle: "Algebra & Calculus",
        topicTags: ["Number Theory"],
        explanation: "7 has only two positive divisors: 1 and 7.",
        options: [
          { id: "opt-yes", label: "A", text: "Yes" },
          { id: "opt-no", label: "B", text: "No" },
        ],
        sourceReference: {
          pageNumber: 2,
          sourceType: "ai_generated",
        },
        reviewStatus: "flagged_review",
        isAiGenerated: true,
        needsVerification: true,
      },
    ],
  },
};

describe("Post-Exam Results and Review Component", () => {
  it("renders the score gauge, progress tracking delta, and correct metrics", () => {
    render(<ResultsClient initialPayload={MOCK_PAYLOAD} />);

    expect(screen.getByText(/JAMB Mathematics Diagnostic 2026/i)).toBeDefined();
    expect(screen.getAllByText("80%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Progress Tracking:/i)).toBeDefined();
    expect(screen.getByText(/\+20%/i)).toBeDefined();
    expect(screen.getByText("Attempt #2")).toBeDefined();
  });

  it("filters questions by status tab (incorrect, correct, all)", () => {
    render(<ResultsClient initialPayload={MOCK_PAYLOAD} />);

    // Default view has both questions
    expect(screen.getByText(/What is 2x \+ 4 = 10\?/i)).toBeDefined();
    expect(screen.getByText(/Is 7 a prime number\?/i)).toBeDefined();

    // Click Incorrect filter button
    const incorrectFilterBtn = screen.getByRole("button", { name: "incorrect" });
    fireEvent.click(incorrectFilterBtn);

    // Question 1 (correct) is hidden, Question 2 (incorrect) remains
    expect(screen.queryByText(/What is 2x \+ 4 = 10\?/i)).toBeNull();
    expect(screen.getByText(/Is 7 a prime number\?/i)).toBeDefined();
  });

  it("opens the Report Question modal and submits candidate feedback", async () => {
    const reportSpy = vi.spyOn(gradingActions, "reportQuestionAction").mockResolvedValue({
      success: true,
      reportId: "rep-999",
    });

    render(<ResultsClient initialPayload={MOCK_PAYLOAD} />);

    // Click Report Issue on first question
    const reportBtns = screen.getAllByRole("button", { name: /Report Issue/i });
    fireEvent.click(reportBtns[0]);

    // Modal opens
    expect(screen.getByText(/Report Question Issue/i)).toBeDefined();

    // Select issue category and type comment
    const commentInput = screen.getByPlaceholderText(/Provide textbook citation/i);
    fireEvent.change(commentInput, { target: { value: "Option B is ambiguous." } });

    // Submit report
    const submitBtn = screen.getByRole("button", { name: /Submit Report/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptId: MOCK_PAYLOAD.attemptId,
          questionId: "q-1",
          comment: "Option B is ambiguous.",
        })
      );
    });
  });

  it("displays AI vs Source Paper badges and pending review flags", () => {
    render(<ResultsClient initialPayload={MOCK_PAYLOAD} />);

    expect(screen.getByText(/Source Paper/i)).toBeDefined();
    expect(screen.getByText(/AI Synthesized/i)).toBeDefined();
    expect(screen.getByText(/Pending Review/i)).toBeDefined();
  });
});

