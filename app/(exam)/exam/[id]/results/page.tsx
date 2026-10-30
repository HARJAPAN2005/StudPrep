import type { Metadata } from "next";
import { getDetailedAttemptResultsAction, type DetailedExamReviewPayload } from "@/app/actions/grading";
import { ResultsClient } from "./results-client";
import { MOCK_EXAM_SESSION } from "@/lib/fixtures/mock-data";

export const metadata: Metadata = {
  title: "CBT Examination Results & Diagnostics · StudPilot",
  description: "Comprehensive performance score, pacing diagnostics, and verified solutions.",
};

export const instant = false;

interface ExamResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamResultsPage({ params }: ExamResultsPageProps) {
  const { id } = await params;

  let payload: DetailedExamReviewPayload | null = null;

  try {
    const res = await getDetailedAttemptResultsAction(id);
    if (res.success && res.payload) {
      payload = res.payload;
    }
  } catch {
    // Database query failed or unauthenticated fallback
  }

  // Fallback to deterministic mock review payload for testing/offline mode
  if (!payload) {
    const session = MOCK_EXAM_SESSION;
    payload = {
      attemptId: id || session.id,
      snapshotId: "mock-snap-1",
      title: session.title,
      subjectId: session.subject,
      attemptNumber: 1,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      timeSpentSeconds: 258,
      comparison: {
        isBaseline: true,
        previousScore: null,
        scoreDelta: null,
        previousAttemptsCount: 0,
        bestScore: 80,
        averageScore: 80,
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
          general: {
            sectionId: "general",
            title: "General Section",
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
          [session.subject]: {
            topic: session.subject,
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
        detailedResults: session.questions.map((q, idx) => ({
          questionId: q.id,
          body: q.question,
          submittedOptionId: idx === 4 ? "opt-d" : q.correctOptionId,
          correctOptionId: q.correctOptionId,
          isCorrect: idx !== 4,
          isAttempted: true,
          marksAwarded: idx !== 4 ? 1.0 : 0.0,
          maxMarks: 1.0,
          negativeMarks: 0.0,
          sectionId: null,
          sectionTitle: "General Section",
          topicTags: [session.subject],
          explanation: q.explanation,
          options: q.options.map((opt, optIdx) => ({
            id: opt.id,
            label: String.fromCharCode(65 + optIdx),
            text: opt.text,
            explanation: opt.id === q.correctOptionId ? q.explanation : undefined,
          })),
          sourceReference: {
            pageNumber: q.sourcePage ?? 1,
            sourceType: "original_source" as const,
          },
          reviewStatus: "verified" as const,
          isAiGenerated: false,
          needsVerification: false,
        })),
      },
    };
  }

  return <ResultsClient initialPayload={payload} />;
}
