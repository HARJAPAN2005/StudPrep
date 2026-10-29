import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExamStudioClient } from "@/app/(dashboard)/exams/builder/exam-studio-client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/app/actions/exam-studio", () => ({
  validateExamSettingsAction: vi.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
  generateDraftQuestionsAction: vi.fn().mockResolvedValue({
    success: true,
    questions: [
      {
        id: "sq-1",
        body: "What is the acceleration due to gravity on Earth's surface?",
        type: "single_choice",
        options: [
          { id: "opt-1", label: "A", text: "9.8 m/s²", explanation: "Standard metric value" },
          { id: "opt-2", label: "B", text: "12.0 m/s²" },
        ],
        correctOptionId: "opt-1",
        explanation: "The standard acceleration due to gravity near Earth's surface is approximately 9.8 m/s².",
        difficulty: "easy",
        topicTags: ["Physics", "Mechanics"],
        marks: 2.0,
        negativeMarks: 0.5,
        sourceReference: { sourceType: "ai_generated" },
        reviewStatus: "verified",
        validationIssues: [],
        orderIndex: 0,
      },
    ],
  }),
  regenerateSingleQuestionAction: vi.fn(),
  publishExamSnapshotAction: vi.fn().mockResolvedValue({ success: true, snapshotId: "snap-123" }),
  launchExamAttemptAction: vi.fn().mockResolvedValue({ success: true, attemptId: "att-123" }),
}));

describe("Exam Studio Client Component", () => {
  const subjects = [{ id: "sub-1", name: "Physics", code: "PHY" }];
  const materials = [
    {
      id: "mat-1",
      title: "Mechanics and Waves Notes",
      filename: "mechanics.pdf",
      hasAnalysis: true,
      detectedQuestionsCount: 12,
    },
  ];

  it("renders the 3 creation modes and updates active mode on selection", () => {
    render(<ExamStudioClient initialSubjects={subjects} initialMaterials={materials} />);

    expect(screen.getByText("Recreate Source Paper")).toBeDefined();
    expect(screen.getByText("Generate Practice Exam")).toBeDefined();
    expect(screen.getByText("Mixed Exam")).toBeDefined();

    const recreateBtn = screen.getByText("Recreate Source Paper").closest("button");
    expect(recreateBtn).toBeDefined();

    fireEvent.click(recreateBtn!);
    expect(recreateBtn?.className).toContain("border-indigo-600");
  });

  it("triggers draft question generation and displays question cards", async () => {
    render(<ExamStudioClient initialSubjects={subjects} initialMaterials={materials} />);

    const generateBtn = screen.getByRole("button", { name: /Generate Exam Draft/i });
    expect(generateBtn).toBeDefined();

    fireEvent.click(generateBtn);

    // Question stem should appear after generation
    const questionStem = await screen.findByText(/What is the acceleration due to gravity on Earth's surface\?/i);
    expect(questionStem).toBeDefined();

    // Summary banner should display question count and duration
    expect(screen.getByText(/Pre-Exam Snapshot Ready/i)).toBeDefined();
    expect(screen.getByText(/• 1 Questions/i)).toBeDefined();
    expect(screen.getByText(/• 2 Total Marks/i)).toBeDefined();
  });
});
