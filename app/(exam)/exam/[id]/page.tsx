import type { Metadata } from "next";
import { getAttemptStateAction, type ActiveAttemptState } from "@/app/actions/exam-engine";
import { ExamRunnerClient } from "./exam-runner-client";
import { MOCK_EXAM_SESSION } from "@/lib/fixtures/mock-data";

export const metadata: Metadata = {
  title: "CBT Examination Workstation · StudPilot",
  description: "Distraction-free computer-based testing examination runner.",
};

export const instant = false;

interface ExamRunnerPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamRunnerPage({ params }: ExamRunnerPageProps) {
  const { id } = await params;

  let state: ActiveAttemptState | null = null;

  try {
    const res = await getAttemptStateAction(id);
    if (res.success && res.state) {
      state = res.state;
    }
  } catch {
    // Database query failed or unauthenticated in preview mode
  }

  // Fallback to mock session for offline/demo/testing environments
  if (!state) {
    const mockSession = MOCK_EXAM_SESSION;
    state = {
      attemptId: id || mockSession.id,
      snapshotId: "mock-snap-1",
      title: mockSession.title,
      status: "not_started",
      timeRemainingSeconds: mockSession.timeLimitMinutes * 60,
      serverDeadline: new Date(
        new Date(mockSession.startedAt).getTime() + mockSession.timeLimitMinutes * 60 * 1000
      ).toISOString(),
      totalMarks: mockSession.questions.length,
      negativeMarking: 0.0,
      questions: mockSession.questions.map((q, idx) => ({
        id: q.id,
        body: q.question,
        type: "single_choice",
        options: q.options.map((opt, optIdx) => ({
          id: opt.id,
          label: String.fromCharCode(65 + optIdx),
          text: opt.text,
        })),
        difficulty: "medium",
        topicTags: [mockSession.subject],
        marks: 1.0,
        negativeMarks: 0.0,
        sourceReference: {
          pageNumber: q.sourcePage ?? 1,
          sourceType: "original_source",
        },
        reviewStatus: "verified",
        validationIssues: [],
        orderIndex: idx,
      })),
      answers: {},
      reviewFlags: {},
      visitedQuestions: { [mockSession.questions[0].id]: true },
      isFinalized: false,
    };
  }

  return <ExamRunnerClient initialState={state} />;
}
