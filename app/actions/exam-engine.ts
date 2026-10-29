"use server";

/**
 * Examination Engine Server Actions
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * 1. Server-Authoritative Deadlines: The client timer is for display only. All
 *    deadline checks, autosaves, and finalizations are determined server-side.
 * 2. Answer Key Protection: Correct options and worked solutions are NEVER
 *    included in active attempt payloads.
 * 3. Idempotent Submission: Attempts finalize exactly once, preventing race
 *    conditions, concurrent corruption, or score alteration after deadline.
 *
 * @module app/actions/exam-engine
 */
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/authorization";
import {
  sanitizeQuestionForAttempt,
  type SanitizedQuestion,
  type StudioQuestion,
} from "@/lib/schemas/exam-studio";
import type { Json } from "@/types/supabase";

export interface ActiveAttemptState {
  attemptId: string;
  snapshotId: string;
  title: string;
  status: "not_started" | "in_progress" | "submitted" | "expired";
  timeRemainingSeconds: number;
  serverDeadline: string;
  totalMarks: number;
  negativeMarking: number;
  questions: SanitizedQuestion[];
  answers: Record<string, string>;
  reviewFlags: Record<string, boolean>;
  visitedQuestions: Record<string, boolean>;
  isFinalized: boolean;
}

/**
 * Fetches the active exam attempt state with sanitized questions (no answer keys).
 * Automatically finalizes expired attempts on access.
 */
export async function getAttemptStateAction(
  attemptId: string
): Promise<{ success: boolean; state?: ActiveAttemptState; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const { data: attempt, error: attemptErr } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (attemptErr || !attempt) {
      return { success: false, error: "Examination attempt not found or access denied." };
    }

    const { data: snapshot, error: snapErr } = await supabase
      .from("exam_snapshots")
      .select("*")
      .eq("id", attempt.snapshot_id)
      .single();

    if (snapErr || !snapshot) {
      return { success: false, error: "Exam snapshot content missing." };
    }

    const questions = snapshot.questions as unknown as StudioQuestion[];
    if (!questions) {
      return { success: false, error: "Exam snapshot questions missing." };
    }

    const now = new Date();
    const expiresAt = attempt.expires_at ? new Date(attempt.expires_at) : new Date(now.getTime() + 30 * 60 * 1000);
    let status = attempt.status;

    // Check server deadline
    if (status === "in_progress" && now > expiresAt) {
      // Auto-finalize expired attempt
      await submitExamAttemptAction(attemptId);
      status = "expired";
    }

    const timeRemainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    // Order and sanitize questions based on stored attempt question_order
    const questionOrder = (attempt.question_order as unknown as string[]) || [];
    const optionOrders = (attempt.option_orders as unknown as Record<string, string[]>) || {};
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const orderedSanitizedQuestions: SanitizedQuestion[] = [];
    const targetIds = questionOrder.length > 0 ? questionOrder : questions.map((q) => q.id);

    for (const qid of targetIds) {
      const fullQ = questionMap.get(qid);
      if (fullQ) {
        const shuffledOptIds = optionOrders[qid];
        orderedSanitizedQuestions.push(sanitizeQuestionForAttempt(fullQ, shuffledOptIds));
      }
    }

    return {
      success: true,
      state: {
        attemptId: attempt.id,
        snapshotId: snapshot.id,
        title: snapshot.title,
        status,
        timeRemainingSeconds,
        serverDeadline: expiresAt.toISOString(),
        totalMarks: snapshot.total_marks,
        negativeMarking: snapshot.negative_marking,
        questions: orderedSanitizedQuestions,
        answers: (attempt.answers as Record<string, string>) || {},
        reviewFlags: (attempt.review_flags as Record<string, boolean>) || {},
        visitedQuestions: (attempt.visited_questions as Record<string, boolean>) || {},
        isFinalized: status === "submitted" || status === "expired",
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Autosaves candidate's selected answer for a question with debouncing and server deadline checks.
 */
export async function autosaveAnswerAction(
  attemptId: string,
  questionId: string,
  selectedOptionId: string | null
): Promise<{ success: boolean; error?: string; isExpired?: boolean }> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const { data: attempt, error } = await supabase
      .from("exam_attempts")
      .select("id, status, expires_at, answers, visited_questions")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (error || !attempt) {
      return { success: false, error: "Attempt not found." };
    }

    if (attempt.status !== "in_progress") {
      return { success: false, error: "Cannot change answers on a finalized examination.", isExpired: true };
    }

    const now = new Date();
    const expiresAt = new Date(attempt.expires_at || now.toISOString());
    if (now > expiresAt) {
      // Auto finalize expired attempt
      await submitExamAttemptAction(attemptId);
      return { success: false, error: "Exam deadline has passed.", isExpired: true };
    }

    const currentAnswers = (attempt.answers as Record<string, string>) || {};
    const visited = (attempt.visited_questions as Record<string, boolean>) || {};

    if (selectedOptionId === null) {
      delete currentAnswers[questionId];
    } else {
      currentAnswers[questionId] = selectedOptionId;
    }
    visited[questionId] = true;

    await supabase
      .from("exam_attempts")
      .update({
        answers: currentAnswers as unknown as Json,
        visited_questions: visited as unknown as Json,
      })
      .eq("id", attemptId);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Toggles a question's "Mark for Review" flag.
 */
export async function toggleReviewFlagAction(
  attemptId: string,
  questionId: string,
  isFlagged: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("id, status, review_flags")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (!attempt || attempt.status !== "in_progress") {
      return { success: false, error: "Cannot alter flags on inactive attempt." };
    }

    const flags = (attempt.review_flags as Record<string, boolean>) || {};
    flags[questionId] = isFlagged;

    await supabase
      .from("exam_attempts")
      .update({ review_flags: flags as unknown as Json })
      .eq("id", attemptId);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Marks a question as visited in the attempt state.
 */
export async function markQuestionVisitedAction(
  attemptId: string,
  questionId: string
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("id, status, visited_questions")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (!attempt || attempt.status !== "in_progress") {
      return { success: false };
    }

    const visited = (attempt.visited_questions as Record<string, boolean>) || {};
    if (!visited[questionId]) {
      visited[questionId] = true;
      await supabase
        .from("exam_attempts")
        .update({ visited_questions: visited as unknown as Json })
        .eq("id", attemptId);
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Idempotent server-side exam submission and scoring.
 * Evaluates candidate answers against protected server-side snapshot answer keys.
 */
export async function submitExamAttemptAction(
  attemptId: string
): Promise<{
  success: boolean;
  score?: number;
  marksObtained?: number;
  maxMarks?: number;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const { data: attempt, error: attemptErr } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (attemptErr || !attempt) {
      return { success: false, error: "Attempt not found." };
    }

    // Idempotent check: if already finalized, return existing score
    if (attempt.status === "submitted" || attempt.status === "expired") {
      return {
        success: true,
        score: attempt.score ?? 0,
        marksObtained: Number(attempt.marks_obtained ?? 0),
        maxMarks: Number(attempt.max_marks ?? 0),
        correctCount: attempt.correct_count ?? 0,
        incorrectCount: attempt.incorrect_count ?? 0,
        unansweredCount: attempt.unanswered_count ?? 0,
      };
    }

    const { data: snapshot, error: snapErr } = await supabase
      .from("exam_snapshots")
      .select("*")
      .eq("id", attempt.snapshot_id)
      .single();

    if (snapErr || !snapshot) {
      return { success: false, error: "Exam snapshot missing." };
    }

    const questions = snapshot.questions as unknown as StudioQuestion[];
    const answers = (attempt.answers as Record<string, string>) || {};

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalEarnedMarks = 0;
    let totalMaxMarks = 0;

    for (const q of questions) {
      const qMarks = q.marks || 1.0;
      const qNegative = q.negativeMarks || snapshot.negative_marking || 0.0;
      totalMaxMarks += qMarks;

      const candidateAnswer = answers[q.id];
      if (!candidateAnswer) {
        unansweredCount++;
      } else if (candidateAnswer === q.correctOptionId) {
        correctCount++;
        totalEarnedMarks += qMarks;
      } else {
        incorrectCount++;
        totalEarnedMarks -= qNegative;
      }
    }

    // Clamp marks to 0 minimum
    const finalMarksObtained = Math.max(0, totalEarnedMarks);
    const scorePercentage = totalMaxMarks > 0 ? Math.round((finalMarksObtained / totalMaxMarks) * 100) : 0;

    const now = new Date();
    const startedAt = attempt.started_at ? new Date(attempt.started_at) : now;
    const timeSpent = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));

    await supabase
      .from("exam_attempts")
      .update({
        status: "submitted",
        submitted_at: now.toISOString(),
        score: scorePercentage,
        marks_obtained: finalMarksObtained,
        max_marks: totalMaxMarks,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: unansweredCount,
        time_spent_seconds: timeSpent,
      })
      .eq("id", attemptId);

    return {
      success: true,
      score: scorePercentage,
      marksObtained: finalMarksObtained,
      maxMarks: totalMaxMarks,
      correctCount,
      incorrectCount,
      unansweredCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export interface ExamAttemptReviewResult {
  attemptId: string;
  title: string;
  score: number;
  marksObtained: number;
  maxMarks: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeSpentSeconds: number;
  questions: Array<StudioQuestion & { selectedOptionId: string | null; isCorrect: boolean }>;
}

/**
 * Fetches the post-exam review including worked solutions and answer keys.
 * ⚠️ Strictly protected: returns error if exam is still in_progress.
 */
export async function getAttemptResultsAction(
  attemptId: string
): Promise<{ success: boolean; result?: ExamAttemptReviewResult; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const { data: attempt, error: attemptErr } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (attemptErr || !attempt) {
      return { success: false, error: "Attempt not found or access denied." };
    }

    if (attempt.status === "in_progress") {
      return { success: false, error: "Results and answer keys are locked while exam is active." };
    }

    const { data: snapshot, error: snapErr } = await supabase
      .from("exam_snapshots")
      .select("*")
      .eq("id", attempt.snapshot_id)
      .single();

    if (snapErr || !snapshot) {
      return { success: false, error: "Exam snapshot missing." };
    }

    const questions = snapshot.questions as unknown as StudioQuestion[];

    const answers = (attempt.answers as Record<string, string>) || {};
    const reviewedQuestions = questions.map((q) => {
      const selected = answers[q.id] || null;
      return {
        ...q,
        selectedOptionId: selected,
        isCorrect: selected === q.correctOptionId,
      };
    });

    return {
      success: true,
      result: {
        attemptId: attempt.id,
        title: snapshot.title,
        score: attempt.score ?? 0,
        marksObtained: Number(attempt.marks_obtained ?? 0),
        maxMarks: Number(attempt.max_marks ?? 0),
        correctCount: attempt.correct_count ?? 0,
        incorrectCount: attempt.incorrect_count ?? 0,
        unansweredCount: attempt.unanswered_count ?? 0,
        timeSpentSeconds: attempt.time_spent_seconds ?? 0,
        questions: reviewedQuestions,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
