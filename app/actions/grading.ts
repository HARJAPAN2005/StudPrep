"use server";

/**
 * Server-Side Grading & Performance Reporting Actions
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * 1. Server-Authoritative Grading: Objective scoring is calculated exclusively
 *    on the server using the immutable exam snapshot. Client score inputs are
 *    rejected.
 * 2. Protected Answer Keys: Answer keys and solutions are locked and forbidden
 *    while an examination attempt is in progress.
 * 3. Strict Student Ownership: Students can only grade, view, or report questions
 *    for their own examination attempts.
 * 4. Idempotent Finalization: Finalized attempts cannot be modified, re-scored,
 *    or double-submitted.
 *
 * @module app/actions/grading
 */
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/authorization";
import {
  ReportQuestionInputSchema,
  type ReportQuestionInput,
  type ExamGradingOutput,
  type HistoricalComparison,
  type GradingConfig,
} from "@/lib/schemas/grading";
import {
  gradeExamAttempt,
  calculateHistoricalComparison,
} from "@/lib/grading/grading-service";
import type { StudioQuestion, ExamSection } from "@/lib/schemas/exam-studio";
import type { Json } from "@/types/supabase";

export interface DetailedExamReviewPayload {
  attemptId: string;
  snapshotId: string;
  title: string;
  subjectId: string;
  attemptNumber: number;
  status: "submitted" | "expired";
  submittedAt: string;
  timeSpentSeconds: number;
  grading: ExamGradingOutput;
  comparison: HistoricalComparison;
}

/**
 * Server-authoritative, deterministic exam attempt grading and finalization.
 * Evaluates stored answers against the snapshot and records finalized results.
 */
export async function gradeAndFinalizeAttemptAction(
  attemptId: string
): Promise<{
  success: boolean;
  payload?: DetailedExamReviewPayload;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // 1. Fetch student attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (attemptErr || !attempt) {
      return { success: false, error: "Examination attempt not found or access denied." };
    }

    // 2. Fetch immutable snapshot
    const { data: snapshot, error: snapErr } = await supabase
      .from("exam_snapshots")
      .select("*")
      .eq("id", attempt.snapshot_id)
      .single();

    if (snapErr || !snapshot) {
      return { success: false, error: "Associated examination snapshot is missing." };
    }

    const questions = snapshot.questions as unknown as StudioQuestion[];
    const sections = (snapshot.sections as unknown as ExamSection[]) || [];
    const storedAnswers = (attempt.answers as Record<string, string>) || {};

    // 3. Fetch prior attempts for historical comparison (authenticated user for this snapshot)
    const { data: priorAttempts } = await supabase
      .from("exam_attempts")
      .select("id, score, submitted_at")
      .eq("snapshot_id", attempt.snapshot_id)
      .eq("student_id", user.id)
      .neq("id", attempt.id)
      .in("status", ["submitted", "expired"]);

    const historicalComparison = calculateHistoricalComparison(
      attempt.score ?? 0,
      (priorAttempts || []).map((a) => ({
        id: a.id,
        score: a.score,
        submittedAt: a.submitted_at,
      }))
    );

    // 4. Idempotency Check: if already finalized, return stored result without re-grading
    if (attempt.status === "submitted" || attempt.status === "expired") {
      const storedGrading: ExamGradingOutput = {
        score: attempt.score ?? 0,
        marksObtained: Number(attempt.marks_obtained ?? 0),
        maxMarks: Number(attempt.max_marks ?? 0),
        accuracy: Number(attempt.accuracy ?? 0),
        correctCount: attempt.correct_count ?? 0,
        incorrectCount: attempt.incorrect_count ?? 0,
        unansweredCount: attempt.unanswered_count ?? 0,
        totalQuestions: questions.length,
        attemptedCount: (attempt.correct_count ?? 0) + (attempt.incorrect_count ?? 0),
        sectionScores: (attempt.section_scores as unknown as ExamGradingOutput["sectionScores"]) || {},
        topicScores: (attempt.topic_scores as unknown as ExamGradingOutput["topicScores"]) || {},
        detailedResults: (attempt.detailed_results as unknown as ExamGradingOutput["detailedResults"]) || [],
      };

      return {
        success: true,
        payload: {
          attemptId: attempt.id,
          snapshotId: snapshot.id,
          title: snapshot.title,
          subjectId: snapshot.subject_id,
          attemptNumber: attempt.attempt_number ?? 1,
          status: attempt.status,
          submittedAt: attempt.submitted_at || new Date().toISOString(),
          timeSpentSeconds: attempt.time_spent_seconds ?? 0,
          grading: storedGrading,
          comparison: historicalComparison,
        },
      };
    }

    // 5. Execute Pure Deterministic Server-Side Grading
    const gradingConfig: GradingConfig = {
      negativeMarking: snapshot.negative_marking ?? 0.0,
      sections,
    };
    const gradingOutput = gradeExamAttempt(questions, storedAnswers, gradingConfig);

    // Compute updated historical comparison with freshly computed score
    const updatedComparison = calculateHistoricalComparison(
      gradingOutput.score,
      (priorAttempts || []).map((a) => ({
        id: a.id,
        score: a.score,
        submittedAt: a.submitted_at,
      }))
    );

    const now = new Date();
    const startedAt = attempt.started_at ? new Date(attempt.started_at) : now;
    const timeSpent = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
    const attemptNumber = (priorAttempts?.length ?? 0) + 1;

    // 6. Atomically persist finalized result
    const { error: updateErr } = await supabase
      .from("exam_attempts")
      .update({
        status: "submitted",
        submitted_at: now.toISOString(),
        score: gradingOutput.score,
        marks_obtained: gradingOutput.marksObtained,
        max_marks: gradingOutput.maxMarks,
        accuracy: gradingOutput.accuracy,
        correct_count: gradingOutput.correctCount,
        incorrect_count: gradingOutput.incorrectCount,
        unanswered_count: gradingOutput.unansweredCount,
        section_scores: gradingOutput.sectionScores as unknown as Json,
        topic_scores: gradingOutput.topicScores as unknown as Json,
        detailed_results: gradingOutput.detailedResults as unknown as Json,
        attempt_number: attemptNumber,
        time_spent_seconds: timeSpent,
      })
      .eq("id", attemptId);

    if (updateErr) {
      return { success: false, error: `Failed to persist final examination grade: ${updateErr.message}` };
    }

    return {
      success: true,
      payload: {
        attemptId: attempt.id,
        snapshotId: snapshot.id,
        title: snapshot.title,
        subjectId: snapshot.subject_id,
        attemptNumber,
        status: "submitted",
        submittedAt: now.toISOString(),
        timeSpentSeconds: timeSpent,
        grading: gradingOutput,
        comparison: updatedComparison,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Retrieves the post-exam detailed review and performance diagnostics.
 * ⚠️ STRICT ACCESS CONTROL:
 * Answer keys and worked solutions are strictly forbidden if the attempt is active.
 */
export async function getDetailedAttemptResultsAction(
  attemptId: string
): Promise<{
  success: boolean;
  payload?: DetailedExamReviewPayload;
  error?: string;
  isLocked?: boolean;
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
      return { success: false, error: "Examination attempt not found or access denied." };
    }

    // Check if attempt is still active
    if (attempt.status === "in_progress" || attempt.status === "not_started") {
      const now = new Date();
      const expiresAt = attempt.expires_at ? new Date(attempt.expires_at) : now;

      if (now > expiresAt) {
        // Auto-finalize expired attempt
        return await gradeAndFinalizeAttemptAction(attemptId);
      }

      return {
        success: false,
        error: "Results and answer keys are strictly protected until the examination is submitted.",
        isLocked: true,
      };
    }

    // Finalize if needed or return existing
    return await gradeAndFinalizeAttemptAction(attemptId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Candidate question reporting action.
 * Allows candidates to flag disputed answer keys, ambiguous questions, or typos.
 */
export async function reportQuestionAction(
  rawInput: ReportQuestionInput
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const parseRes = ReportQuestionInputSchema.safeParse(rawInput);
    if (!parseRes.success) {
      return { success: false, error: parseRes.error.issues[0]?.message || "Invalid report input" };
    }

    const { attemptId, questionId, issueType, comment } = parseRes.data;
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Verify ownership of the examination attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("exam_attempts")
      .select("id, student_id")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (attemptErr || !attempt) {
      return { success: false, error: "Examination attempt not found or unauthorized." };
    }

    // Insert into reported_questions
    const { data: report, error: reportErr } = await supabase
      .from("reported_questions")
      .insert({
        attempt_id: attempt.id,
        student_id: user.id,
        question_id: questionId,
        issue_type: issueType,
        comment: comment || null,
        status: "open",
      })
      .select("id")
      .single();

    if (reportErr || !report) {
      return { success: false, error: `Failed to record question report: ${reportErr?.message}` };
    }

    return { success: true, reportId: report.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

