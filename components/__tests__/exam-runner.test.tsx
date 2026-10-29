import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExamRunnerClient } from "@/app/(exam)/exam/[id]/exam-runner-client";
import type { ActiveAttemptState } from "@/app/actions/exam-engine";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/app/actions/exam-engine", () => ({
  autosaveAnswerAction: vi.fn().mockResolvedValue({ success: true }),
  toggleReviewFlagAction: vi.fn().mockResolvedValue({ success: true }),
  markQuestionVisitedAction: vi.fn().mockResolvedValue({ success: true }),
  submitExamAttemptAction: vi.fn().mockResolvedValue({ success: true, score: 100 }),
}));

describe("CBT Exam Runner Workstation Component", () => {
  const mockInitialState: ActiveAttemptState = {
    attemptId: "att-test-1",
    snapshotId: "snap-test-1",
    title: "UTME General Physics Speed Test",
    status: "in_progress",
    timeRemainingSeconds: 1200,
    serverDeadline: new Date(Date.now() + 1200 * 1000).toISOString(),
    totalMarks: 4.0,
    negativeMarking: 0.25,
    questions: [
      {
        id: "q-1",
        body: "Which physical quantity has the SI unit of Tesla (T)?",
        type: "single_choice",
        options: [
          { id: "opt-1", label: "A", text: "Magnetic flux density" },
          { id: "opt-2", label: "B", text: "Electric capacitance" },
          { id: "opt-3", label: "C", text: "Inductance" },
          { id: "opt-4", label: "D", text: "Electric field strength" },
        ],
        difficulty: "medium",
        topicTags: ["Electromagnetism"],
        marks: 2.0,
        negativeMarks: 0.25,
        sourceReference: { sourceType: "ai_generated", pageNumber: 5 },
        reviewStatus: "verified",
        validationIssues: [],
        orderIndex: 0,
      },
      {
        id: "q-2",
        body: "Sound waves cannot propagate through a vacuum because they require a material medium.",
        type: "true_false",
        options: [
          { id: "opt-2a", label: "A", text: "True" },
          { id: "opt-2b", label: "B", text: "False" },
        ],
        difficulty: "easy",
        topicTags: ["Waves"],
        marks: 2.0,
        negativeMarks: 0.25,
        sourceReference: { sourceType: "original_source", pageNumber: 8 },
        reviewStatus: "verified",
        validationIssues: [],
        orderIndex: 1,
      },
    ],
    answers: {},
    reviewFlags: {},
    visitedQuestions: { "q-1": true },
    isFinalized: false,
  };

  it("renders exam title, active question, and option radio cards", () => {
    render(<ExamRunnerClient initialState={mockInitialState} />);

    expect(screen.getByText("UTME General Physics Speed Test")).toBeDefined();
    expect(screen.getByText("Which physical quantity has the SI unit of Tesla (T)?")).toBeDefined();
    expect(screen.getByText("Magnetic flux density")).toBeDefined();
    expect(screen.getByText("Electric capacitance")).toBeDefined();
  });

  it("selects an option on click and marks answer", async () => {
    render(<ExamRunnerClient initialState={mockInitialState} />);

    const optButton = screen.getByText("Magnetic flux density").closest("button");
    expect(optButton).toBeDefined();

    fireEvent.click(optButton!);

    // Option button should now have selected indigo styling
    expect(optButton?.className).toContain("border-indigo-500");

    // Palette should reflect 1 answered
    expect(screen.getByText(/1 \/ 2 Answered/i)).toBeDefined();
  });

  it("toggles mark for review flag", () => {
    render(<ExamRunnerClient initialState={mockInitialState} />);

    const flagBtn = screen.getByRole("button", { name: /Mark for Review/i });
    expect(flagBtn).toBeDefined();

    fireEvent.click(flagBtn);
    expect(screen.getByText("Flagged for Review")).toBeDefined();
  });

  it("navigates to next question on Next click", () => {
    render(<ExamRunnerClient initialState={mockInitialState} />);

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(
      screen.getByText(/Sound waves cannot propagate through a vacuum/i)
    ).toBeDefined();
  });

  it("opens submit confirmation modal and displays answered/unanswered counts", () => {
    render(<ExamRunnerClient initialState={mockInitialState} />);

    const submitBtn = screen.getByRole("button", { name: /Submit Exam/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Confirm Exam Submission")).toBeDefined();
    expect(screen.getByText(/You have 2 unanswered questions remaining/i)).toBeDefined();
  });
});
