import type { Metadata } from "next";
import { getAttemptResultsAction, type ExamAttemptReviewResult } from "@/app/actions/exam-engine";
import { ResultsClient } from "./results-client";
import { MOCK_EXAM_SESSION } from "@/lib/fixtures/mock-data";

export const metadata: Metadata = {
  title: "CBT Examination Results · StudPilot",
  description: "Comprehensive performance score, pacing analytics, and verified solutions.",
};

export const instant = false;

interface ExamResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamResultsPage({ params }: ExamResultsPageProps) {
  const { id } = await params;

  let result: ExamAttemptReviewResult | null = null;

  try {
    const res = await getAttemptResultsAction(id);
    if (res.success && res.result) {
      result = res.result;
    }
  } catch {
    // Database query failed or unauthenticated
  }

  // Fallback to mock session results for offline/test environments
  if (!result) {
    const session = MOCK_EXAM_SESSION;
    result = {
      attemptId: id || session.id,
      title: session.title,
      score: 80,
      marksObtained: 4.0,
      maxMarks: 5.0,
      correctCount: 4,
      incorrectCount: 1,
      unansweredCount: 0,
      timeSpentSeconds: 258,
      questions: session.questions.map((q, idx) => ({
        id: q.id,
        body: q.question,
        type: "single_choice",
        options: q.options.map((opt, optIdx) => ({
          id: opt.id,
          label: String.fromCharCode(65 + optIdx),
          text: opt.text,
          explanation: opt.id === q.correctOptionId ? q.explanation : undefined,
        })),
        correctOptionId: q.correctOptionId,
        explanation: q.explanation,
        difficulty: "medium",
        topicTags: [session.subject],
        marks: 1.0,
        negativeMarks: 0.0,
        sourceReference: {
          pageNumber: q.sourcePage ?? 1,
          sourceType: "original_source",
        },
        reviewStatus: "verified",
        validationIssues: [],
        orderIndex: idx,
        selectedOptionId: idx === 4 ? "opt-d" : q.correctOptionId,
        isCorrect: idx !== 4,
      })),
    };
  }

  return <ResultsClient initialResult={result} />;
}
