import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnalyticsDashboardClient } from "@/app/(dashboard)/analytics/analytics-client";
import type { AnalyticsDashboardPayload, RevisionPlanOutput } from "@/lib/schemas/analytics";
import * as analyticsActions from "@/app/actions/analytics";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const EMPTY_PAYLOAD: AnalyticsDashboardPayload = {
  studentId: "student-1",
  generatedAt: "2026-10-30T10:00:00Z",
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
  difficultyBreakdown: {
    easy: { total: 0, correct: 0, accuracy: 0 },
    medium: { total: 0, correct: 0, accuracy: 0 },
    hard: { total: 0, correct: 0, accuracy: 0 },
  },
  examHistory: [],
  hasData: false,
};

const POPULATED_PAYLOAD: AnalyticsDashboardPayload = {
  studentId: "student-1",
  generatedAt: "2026-10-30T10:00:00Z",
  totalExams: 3,
  totalQuestions: 30,
  totalTimeSpentSeconds: 1800,
  overallAvgScore: 75,
  overallAccuracy: 80,
  bestScore: 85,
  skipRate: 15, // > 10% should trigger skip alert
  negativeMarkImpact: 2.5, // > 0 should trigger penalty alert
  scoreTrend: [
    { attemptId: "att-1", label: "Attempt 1", score: 65, accuracy: 70, submittedAt: "2026-10-10T10:00:00Z" },
    { attemptId: "att-2", label: "Attempt 2", score: 75, accuracy: 80, submittedAt: "2026-10-20T10:00:00Z" },
    { attemptId: "att-3", label: "Attempt 3", score: 85, accuracy: 90, submittedAt: "2026-10-30T10:00:00Z" },
  ],
  trendSufficient: true,
  subjectBreakdowns: [
    {
      subjectId: "sub-1",
      subjectName: "Mathematics",
      examCount: 3,
      avgScore: 75,
      avgAccuracy: 80,
      totalQuestions: 30,
      bestScore: 85,
      latestScore: 85,
      scoreTrend: "improving",
    },
  ],
  topicAnalytics: [
    {
      topic: "Calculus",
      totalQuestions: 3, // < 5, so isLowSample is true
      correctCount: 1,
      incorrectCount: 1,
      unansweredCount: 1,
      accuracy: 50,
      overallScore: 33,
      marksObtained: 1,
      maxMarks: 3,
      masteryLevel: "needs_review",
      isLowSample: true,
      examCount: 2,
    },
    {
      topic: "Algebra",
      totalQuestions: 15,
      correctCount: 12,
      incorrectCount: 3,
      unansweredCount: 0,
      accuracy: 80,
      overallScore: 80,
      marksObtained: 12,
      maxMarks: 15,
      masteryLevel: "mastered",
      isLowSample: false,
      examCount: 3,
    },
  ],
  difficultyBreakdown: {
    easy: { total: 10, correct: 9, accuracy: 90 },
    medium: { total: 15, correct: 11, accuracy: 73 },
    hard: { total: 5, correct: 2, accuracy: 40 },
  },
  examHistory: [
    {
      attemptId: "att-3",
      snapshotId: "snap-3",
      title: "JAMB Mathematics Mock 3",
      subjectId: "sub-1",
      subjectName: "Mathematics",
      mode: "generate_practice",
      status: "submitted",
      score: 85,
      marksObtained: 17,
      maxMarks: 20,
      accuracy: 90,
      correctCount: 9,
      incorrectCount: 1,
      unansweredCount: 0,
      totalQuestions: 10,
      timeSpentSeconds: 600,
      avgSecondsPerQuestion: 60,
      negativeMarksLost: 0,
      attemptNumber: 1,
      submittedAt: "2026-10-30T10:00:00Z",
    },
  ],
  hasData: true,
};

describe("AnalyticsDashboardClient Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state correctly when student has no exams", () => {
    render(<AnalyticsDashboardClient payload={EMPTY_PAYLOAD} />);

    expect(screen.getByText(/No exam data yet/i)).toBeDefined();
    expect(screen.getByText(/Complete your first exam to unlock analytics/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Generate Your First Exam/i })).toBeDefined();
  });

  it("renders metric cards and summary stats when payload has data", () => {
    render(<AnalyticsDashboardClient payload={POPULATED_PAYLOAD} />);

    expect(screen.getAllByText("75%").length).toBeGreaterThanOrEqual(1); // Avg score
    expect(screen.getAllByText("80%").length).toBeGreaterThanOrEqual(1); // Accuracy
    expect(screen.getByText("3")).toBeDefined(); // Exams taken
    expect(screen.getByText("30")).toBeDefined(); // Questions done
  });

  it("displays warnings for high skip rate and negative marks lost", () => {
    render(<AnalyticsDashboardClient payload={POPULATED_PAYLOAD} />);

    expect(screen.getByText(/High Skip Rate: 15%/i)).toBeDefined();
    expect(screen.getByText(/Negative Marks Lost: 2.5/i)).toBeDefined();
  });

  it("renders SVG score trend chart when trendSufficient is true", () => {
    render(<AnalyticsDashboardClient payload={POPULATED_PAYLOAD} />);

    expect(screen.getByRole("img", { name: /Score trend chart over 3 exams/i })).toBeDefined();
    expect(screen.getByText("Best: 85%")).toBeDefined();
  });

  it("renders insufficient data message in chart when trendSufficient is false", () => {
    const insufficientPayload: AnalyticsDashboardPayload = {
      ...POPULATED_PAYLOAD,
      trendSufficient: false,
      scoreTrend: [{ attemptId: "att-1", label: "Attempt 1", score: 65, accuracy: 70, submittedAt: "2026-10-10T10:00:00Z" }],
    };

    render(<AnalyticsDashboardClient payload={insufficientPayload} />);

    expect(screen.getByText(/Insufficient data for trend/i)).toBeDefined();
    expect(screen.getByText(/Complete at least 3 exams to see your score trajectory/i)).toBeDefined();
  });

  it("displays small-sample caveat on topic with fewer than 5 questions", () => {
    render(<AnalyticsDashboardClient payload={POPULATED_PAYLOAD} />);

    // Calculus isLowSample=true
    expect(screen.getByText("Calculus")).toBeDefined();
    expect(screen.getByText(/Estimate — fewer than 5 questions/i)).toBeDefined();

    // Algebra isLowSample=false, shouldn't have caveat
    expect(screen.getByText("Algebra")).toBeDefined();
  });

  it("renders subject breakdown and difficulty breakdown", () => {
    render(<AnalyticsDashboardClient payload={POPULATED_PAYLOAD} />);

    expect(screen.getAllByText("Mathematics").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Improving/i)).toBeDefined();

    expect(screen.getByText("easy")).toBeDefined();
    expect(screen.getAllByText("90%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("medium")).toBeDefined();
    expect(screen.getByText("73%")).toBeDefined();
    expect(screen.getByText("hard")).toBeDefined();
    expect(screen.getByText("40%")).toBeDefined();
  });

  it("renders exam history table with review link", () => {
    render(<AnalyticsDashboardClient payload={POPULATED_PAYLOAD} />);

    expect(screen.getByText("JAMB Mathematics Mock 3")).toBeDefined();
    expect(screen.getByRole("link", { name: "Review" })).toBeDefined();
  });

  it("generates AI revision plan when button is clicked", async () => {
    const mockPlan: RevisionPlanOutput = {
      summary: "Prioritize Calculus fundamentals and practice timed questions.",
      recommendations: [
        {
          priority: "critical",
          topic: "Calculus",
          subject: "Mathematics",
          accuracy: 50,
          rationale: "Accuracy is 50% across 3 questions.",
          suggestedActions: ["Review limits and derivatives", "Solve 10 practice problems"],
          isLowSampleWarning: true,
        },
      ],
      suggestedPracticeSessionCount: 4,
      disclaimer: "AI-generated recommendation based on limited exam records.",
      generatedAt: "2026-10-30T10:00:00Z",
    };

    const actionSpy = vi
      .spyOn(analyticsActions, "generateRevisionPlanAction")
      .mockResolvedValue({
        success: true,
        plan: mockPlan,
      });

    render(<AnalyticsDashboardClient payload={POPULATED_PAYLOAD} />);

    const generateBtn = screen.getByRole("button", { name: /Generate Revision Plan/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(actionSpy).toHaveBeenCalled();
      expect(screen.getByText(/Prioritize Calculus fundamentals/i)).toBeDefined();
      expect(screen.getByText(/CRITICAL/i)).toBeDefined();
      expect(screen.getByText(/Review limits and derivatives/i)).toBeDefined();
      expect(screen.getByText(/Suggested practice sessions/i)).toBeDefined();
      expect(screen.getByText("4")).toBeDefined();
      expect(screen.getByText(/AI-generated recommendation based on limited/i)).toBeDefined();
    });
  });
});
