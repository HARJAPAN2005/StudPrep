import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuestionTutorPanel } from "@/components/exam/question-tutor-panel";
import * as analyticsActions from "@/app/actions/analytics";
import type { TutorResponse } from "@/lib/schemas/analytics";

describe("QuestionTutorPanel Component", () => {
  const attemptId = "11111111-1111-1111-1111-111111111111";
  const questionId = "q-1";

  const mockTutorResponse: TutorResponse = {
    questionId: "q-1",
    whyCorrectIsRight: "Subtracting 4 yields 2x = 6, dividing by 2 yields x = 3.",
    whyStudentWasWrong: "You added 4 instead of subtracting, getting 2x = 14.",
    coreConceptExplained: "Inverse operations on algebraic linear equations.",
    simplerAnalogy: "Like undoing wrapping paper step by step.",
    practiceSuggestion: "Practice 10 two-step linear equations.",
    sourceBoundNote: "Directly derived from Chapter 2 syllabus objectives.",
    uncertaintyLevel: "verified_source",
    fromCache: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button initially collapsed", () => {
    render(<QuestionTutorPanel attemptId={attemptId} questionId={questionId} />);

    expect(screen.getByRole("button", { name: /Ask AI Tutor to Explain/i })).toBeDefined();
    expect(screen.queryByText(/AI Tutor Guidance/i)).toBeNull();
  });

  it("fetches and displays AI tutor response on button click", async () => {
    const actionSpy = vi
      .spyOn(analyticsActions, "getQuestionTutorAction")
      .mockResolvedValue({
        success: true,
        tutor: mockTutorResponse,
      });

    render(<QuestionTutorPanel attemptId={attemptId} questionId={questionId} />);

    fireEvent.click(screen.getByRole("button", { name: /Ask AI Tutor to Explain/i }));

    await waitFor(() => {
      expect(actionSpy).toHaveBeenCalledWith(attemptId, questionId);
      expect(screen.getByText(/AI Tutor Guidance/i)).toBeDefined();
      expect(screen.getByText(/Subtracting 4 yields 2x = 6/i)).toBeDefined();
      expect(screen.getByText(/Misconception Analysis:/i)).toBeDefined();
      expect(screen.getByText(/You added 4 instead of subtracting/i)).toBeDefined();
      expect(screen.getByText(/Inverse operations on algebraic linear equations/i)).toBeDefined();
      expect(screen.getByText(/Like undoing wrapping paper step by step/i)).toBeDefined();
      expect(screen.getByText(/Verified Source Grounding/i)).toBeDefined();
    });
  });

  it("shows cached response badge when fromCache is true", async () => {
    vi.spyOn(analyticsActions, "getQuestionTutorAction").mockResolvedValue({
      success: true,
      tutor: { ...mockTutorResponse, fromCache: true },
    });

    render(<QuestionTutorPanel attemptId={attemptId} questionId={questionId} />);

    fireEvent.click(screen.getByRole("button", { name: /Ask AI Tutor to Explain/i }));

    await waitFor(() => {
      expect(screen.getByText(/Cached response/i)).toBeDefined();
    });
  });

  it("displays error message and allows retry when action fails", async () => {
    const actionSpy = vi
      .spyOn(analyticsActions, "getQuestionTutorAction")
      .mockResolvedValue({
        success: false,
        error: "AI tutor is temporarily busy.",
      });

    render(<QuestionTutorPanel attemptId={attemptId} questionId={questionId} />);

    fireEvent.click(screen.getByRole("button", { name: /Ask AI Tutor to Explain/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI tutor is temporarily busy/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeDefined();
    });

    // Retry
    actionSpy.mockResolvedValueOnce({
      success: true,
      tutor: mockTutorResponse,
    });

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI Tutor Guidance/i)).toBeDefined();
    });
  });

  it("toggles visibility without refetching when data is already loaded", async () => {
    const actionSpy = vi
      .spyOn(analyticsActions, "getQuestionTutorAction")
      .mockResolvedValue({
        success: true,
        tutor: mockTutorResponse,
      });

    render(<QuestionTutorPanel attemptId={attemptId} questionId={questionId} />);

    // Click to open
    fireEvent.click(screen.getByRole("button", { name: /Ask AI Tutor to Explain/i }));
    await waitFor(() => {
      expect(screen.getByText(/AI Tutor Guidance/i)).toBeDefined();
    });

    expect(actionSpy).toHaveBeenCalledTimes(1);

    // Click to hide
    fireEvent.click(screen.getByRole("button", { name: /Hide AI Tutor Breakdown/i }));
    expect(screen.queryByText(/AI Tutor Guidance/i)).toBeNull();

    // Click to re-open
    fireEvent.click(screen.getByRole("button", { name: /Ask AI Tutor to Explain/i }));
    expect(screen.getByText(/AI Tutor Guidance/i)).toBeDefined();
    expect(actionSpy).toHaveBeenCalledTimes(1); // not called again
  });
});
