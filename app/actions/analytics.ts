"use server";

/**
 * Analytics & AI Tutor Server Actions
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * 1. All analytics are scoped to the authenticated user's own data.
 * 2. Cross-student access is blocked by RLS and explicit ownership checks.
 * 3. AI revision plan receives ONLY aggregated metrics — never raw document text
 *    or individual question content from another student.
 * 4. AI tutor is post-submission only; active exam answer keys are never exposed.
 * 5. API keys stay server-side. Token cost + latency logged on every AI call.
 *
 * @module app/actions/analytics
 */

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/authorization";
import {
  buildAnalyticsDashboard,
  type RawAttemptRecord,
  type RawSnapshotRecord,
  type SubjectNameMap,
} from "@/lib/analytics/analytics-engine";
import {
  RevisionPlanInputSchema,
  RevisionPlanOutputSchema,
  TutorRequestSchema,
  TutorResponseSchema,
  type AnalyticsDashboardPayload,
  type RevisionPlanOutput,
  type TutorResponse,
} from "@/lib/schemas/analytics";
import { getAIProvider } from "@/lib/ai/provider";
import type { QuestionGradingResult } from "@/lib/schemas/grading";
import type { Json } from "@/types/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────

const REVISION_PLAN_SYSTEM_PROMPT = `
You are an expert academic tutor helping a student improve their exam performance.
You will receive aggregated performance metrics (NOT raw questions or answer keys).
Provide specific, actionable revision recommendations based strictly on the data.
Do not fabricate statistics, invent comparisons, or claim percentile rankings.
Do NOT invent student weaknesses. The underlying metrics (conceptual misunderstandings, calculation errors, time pressure, difficulty cliffs, penalty guessing) are calculated deterministically in code. Ground all recommendations strictly in those code-calculated metrics.
Do not reveal answer keys or question content.
Return only a valid JSON object matching the requested schema.
`.trim();

const TUTOR_SYSTEM_PROMPT = `
You are a subject-matter expert and academic tutor.
You will receive a single exam question along with the student's submitted answer and the correct answer.
Explain WHY the correct answer is right and (if applicable) why the student's answer was wrong.
Be concise, accurate, and educational. Ground your explanation in the question content.
If you are uncertain about a concept, acknowledge it honestly.
Do not fabricate citations. Do not reveal other exam questions or answer keys.
Return only a valid JSON object matching the requested schema.
`.trim();

// ── Action 1: Get Analytics Dashboard ────────────────────────────────────────

/**
 * Builds the full analytics dashboard payload for the authenticated student.
 * All data is scoped to their own exam attempts; no cross-student access.
 */
export async function getAnalyticsDashboardAction(): Promise<{
  success: boolean;
  payload?: AnalyticsDashboardPayload;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Fetch this student's finalized attempts only
    const { data: attemptsData, error: attemptsError } = await supabase
      .from("exam_attempts")
      .select(
        "id, snapshot_id, student_id, status, score, marks_obtained, max_marks, accuracy, correct_count, incorrect_count, unanswered_count, time_spent_seconds, attempt_number, submitted_at, detailed_results, topic_scores, section_scores"
      )
      .eq("student_id", user.id)
      .in("status", ["submitted", "expired"])
      .order("submitted_at", { ascending: false });

    if (attemptsError) {
      console.error("[analytics] Failed to fetch attempts:", attemptsError.message);
      return { success: false, error: "Failed to load exam history." };
    }

    const attempts = (attemptsData ?? []) as RawAttemptRecord[];

    if (attempts.length === 0) {
      // Return empty dashboard without querying more tables
      const emptyPayload = buildAnalyticsDashboard(user.id, [], new Map(), {});
      return { success: true, payload: emptyPayload };
    }

    // Fetch snapshots for these attempts
    const snapshotIds = [...new Set(attempts.map((a) => a.snapshot_id))];
    const { data: snapshotsData, error: snapshotsError } = await supabase
      .from("exam_snapshots")
      .select("id, title, subject_id, mode, total_questions")
      .in("id", snapshotIds);

    if (snapshotsError) {
      console.error("[analytics] Failed to fetch snapshots:", snapshotsError.message);
      return { success: false, error: "Failed to load exam details." };
    }

    const snapshotMap = new Map<string, RawSnapshotRecord>();
    for (const s of snapshotsData ?? []) {
      snapshotMap.set(s.id, s as RawSnapshotRecord);
    }

    // Fetch all subjects for name lookup
    const { data: subjectsData, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("is_archived", false);

    if (subjectsError) {
      console.warn("[analytics] Failed to fetch subjects:", subjectsError.message);
    }

    const subjectNames: SubjectNameMap = {};
    for (const s of subjectsData ?? []) {
      subjectNames[s.id] = s.name;
    }

    const payload = buildAnalyticsDashboard(user.id, attempts, snapshotMap, subjectNames);
    return { success: true, payload };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analytics] getAnalyticsDashboardAction error:", message);
    return { success: false, error: "Analytics unavailable. Please try again." };
  }
}

// ── Action 2: Generate AI Revision Plan ──────────────────────────────────────

/**
 * Generates a personalised revision plan using only the student's authorized
 * aggregated analytics. Raw document text, question content, and answer keys
 * are never included in the AI prompt.
 */
export async function generateRevisionPlanAction(): Promise<{
  success: boolean;
  plan?: RevisionPlanOutput;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Get authorized analytics (re-uses the same ownership checks)
    const dashboardResult = await getAnalyticsDashboardAction();
    if (!dashboardResult.success || !dashboardResult.payload) {
      return { success: false, error: dashboardResult.error ?? "No analytics data available." };
    }

    const payload = dashboardResult.payload;
    if (!payload.hasData || payload.totalExams < 1) {
      return { success: false, error: "Complete at least one exam before generating a revision plan." };
    }

    // Strip to only the safe, aggregated inputs — never raw content
    const planInputRaw = {
      studentId: user.id,
      totalExams: payload.totalExams,
      overallAvgScore: payload.overallAvgScore,
      overallAccuracy: payload.overallAccuracy,
      mistakeDiagnosis: payload.fiveQuestions.whyAmIMakingMistakes,
      topicAnalytics: payload.topicAnalytics
        .slice(0, 30) // cap at 30 to keep prompt bounded
        .map((t) => ({
          topic: t.topic,
          accuracy: t.accuracy,
          totalQuestions: t.totalQuestions,
          masteryLevel: t.masteryLevel,
          isLowSample: t.isLowSample,
        })),
      subjectBreakdowns: payload.subjectBreakdowns
        .slice(0, 10)
        .map((s) => ({
          subjectName: s.subjectName,
          avgScore: s.avgScore,
          examCount: s.examCount,
          scoreTrend: s.scoreTrend,
        })),
    };

    // Validate the input before sending to AI
    const inputParsed = RevisionPlanInputSchema.safeParse(planInputRaw);
    if (!inputParsed.success) {
      const issues = inputParsed.error.errors.map((e) => e.message).join("; ");
      console.error("[analytics] Revision plan input validation failed:", issues);
      return { success: false, error: "Insufficient data to generate a revision plan." };
    }

    const prompt = `
Generate a personalised revision plan for this student based ONLY on their code-calculated performance data below.
Do NOT invent student weaknesses. The underlying metrics (conceptual misunderstandings, calculation errors, time pressure, difficulty cliffs, penalty guessing) have been calculated deterministically in code (see mistakeDiagnosis). Ground your interpretations strictly in these metrics.
If a topic has isLowSample=true, acknowledge this is a rough estimate.

Student Performance Summary & Code-Calculated Mistake Metrics:
${JSON.stringify(inputParsed.data, null, 2)}

Return a JSON object with:
- summary: string (max 600 chars) — overall strengths and focus areas
- recommendations: array of up to 10 recommendations, each with: priority ("critical"|"high"|"medium"), topic, subject, accuracy (number), rationale (max 300 chars), suggestedActions (array of up to 4 strings, max 150 chars each), isLowSampleWarning (bool)
- suggestedPracticeSessionCount: integer 1-20
- disclaimer: string noting this is AI-generated and based on limited data
- generatedAt: current ISO datetime string
    `.trim();

    const aiProvider = getAIProvider();
    const startMs = Date.now();

    const aiResult = await aiProvider.generateStructured({
      systemPrompt: REVISION_PLAN_SYSTEM_PROMPT,
      prompt,
      schema: RevisionPlanOutputSchema,
      temperature: 0.3,
      maxTokens: 2048,
      timeoutMs: 45000,
    });

    const latencyMs = Date.now() - startMs;
    console.info(
      `[analytics/revision-plan] studentId=${user.id} model=${aiResult.model} ` +
        `inputTokens=${aiResult.usage.inputTokens} outputTokens=${aiResult.usage.outputTokens} ` +
        `latencyMs=${latencyMs}`
    );

    return { success: true, plan: aiResult.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analytics] generateRevisionPlanAction error:", message);
    return {
      success: false,
      error: "Revision plan generation is temporarily unavailable. Please try again later.",
    };
  }
}

// ── Action 3: Get Question AI Tutor ──────────────────────────────────────────

/**
 * Returns an AI explanation for a single question from a finalized attempt.
 *
 * Security controls:
 * - Attempt must belong to authenticated user (enforced by ownership check)
 * - Attempt must be submitted/expired (no active exam access)
 * - Response is cached in question_tutor_cache keyed on (attempt_id, question_id)
 * - Prompt is bounded: only question body, options, student answer, correct answer
 * - No raw document text is sent to AI
 */
export async function getQuestionTutorAction(
  attemptId: string,
  questionId: string
): Promise<{
  success: boolean;
  tutor?: TutorResponse;
  error?: string;
}> {
  try {
    // Validate inputs first
    const inputParsed = TutorRequestSchema.safeParse({ attemptId, questionId });
    if (!inputParsed.success) {
      return { success: false, error: "Invalid request parameters." };
    }

    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Ownership check: attempt must belong to this student
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("id, student_id, status, detailed_results")
      .eq("id", attemptId)
      .eq("student_id", user.id) // RLS + explicit check
      .single();

    if (attemptError || !attempt) {
      return { success: false, error: "Exam attempt not found or access denied." };
    }

    // Gate: tutor only available after submission (no live exam leakage)
    if (attempt.status !== "submitted" && attempt.status !== "expired") {
      return {
        success: false,
        error: "AI tutor is only available after you have submitted the exam.",
      };
    }

    // Check cache first — avoid redundant AI calls
    const { data: cached, error: cacheError } = await supabase
      .from("question_tutor_cache")
      .select("response")
      .eq("attempt_id", attemptId)
      .eq("student_id", user.id)
      .eq("question_id", questionId)
      .maybeSingle();

    if (!cacheError && cached?.response) {
      const cachedParsed = TutorResponseSchema.safeParse(cached.response);
      if (cachedParsed.success) {
        return {
          success: true,
          tutor: { ...cachedParsed.data, fromCache: true },
        };
      }
    }

    // Find the question in detailed_results
    const detailedResults = Array.isArray(attempt.detailed_results)
      ? (attempt.detailed_results as QuestionGradingResult[])
      : [];

    const questionResult = detailedResults.find((q) => q.questionId === questionId);
    if (!questionResult) {
      return { success: false, error: "Question not found in this exam attempt." };
    }

    // Build bounded AI prompt (no raw document text)
    const options = questionResult.options ?? [];
    const optionLines = options
      .map((o) => `  ${o.label}. ${o.text}`)
      .join("\n");

    const correctOpt = options.find(
      (o) => o.id.toLowerCase() === questionResult.correctOptionId.toLowerCase()
    );
    const correctLabel = correctOpt
      ? `${correctOpt.label}. ${correctOpt.text}`
      : questionResult.correctOptionId;

    const submittedOpt = questionResult.submittedOptionId
      ? options.find(
          (o) => o.id.toLowerCase() === questionResult.submittedOptionId!.toLowerCase()
        )
      : null;
    const submittedLabel = submittedOpt
      ? `${submittedOpt.label}. ${submittedOpt.text}`
      : questionResult.submittedOptionId ?? "(Not attempted)";

    const sourceRef =
      questionResult.sourceReference?.sourceType === "original_source"
        ? `Page ${questionResult.sourceReference.pageNumber || 1}`
        : "AI synthesized";

    const prompt = `
Question:
${questionResult.body || "(Question text unavailable)"}

Options:
${optionLines || "(Options unavailable)"}

Correct Answer: ${correctLabel}
Student's Answer: ${submittedLabel}
Student's Result: ${
      !questionResult.isAttempted
        ? "Skipped / not attempted"
        : questionResult.isCorrect
          ? "Correct"
          : "Incorrect"
    }
Marks Awarded: ${questionResult.marksAwarded}

Source reference: ${sourceRef}

Please explain:
1. Why the correct answer is right
2. Why the student's answer was wrong (if applicable)
3. The core concept being tested
4. A simpler analogy or memory aid
5. A specific practice suggestion

Return a JSON object with these exact fields:
- questionId: string (use "${questionId}")
- whyCorrectIsRight: string (max 500 chars)
- whyStudentWasWrong: string | null (max 500 chars; null if correct or not attempted)
- coreConceptExplained: string (max 600 chars)
- simplerAnalogy: string (max 400 chars)
- practiceSuggestion: string (max 400 chars)
- sourceBoundNote: string (max 300 chars) — describe whether this comes from the student's uploaded material or general knowledge
- uncertaintyLevel: "verified_source" | "inferred" | "general_knowledge"
- fromCache: false
    `.trim();

    const aiProvider = getAIProvider();
    const startMs = Date.now();

    const aiResult = await aiProvider.generateStructured({
      systemPrompt: TUTOR_SYSTEM_PROMPT,
      prompt,
      schema: TutorResponseSchema,
      temperature: 0.2,
      maxTokens: 1024,
      timeoutMs: 30000,
    });

    const latencyMs = Date.now() - startMs;
    console.info(
      `[analytics/tutor] studentId=${user.id} attemptId=${attemptId} questionId=${questionId} ` +
        `model=${aiResult.model} inputTokens=${aiResult.usage.inputTokens} ` +
        `outputTokens=${aiResult.usage.outputTokens} latencyMs=${latencyMs}`
    );

    // Persist to cache (best-effort; do not block response on failure)
    const cachePayload = {
      attempt_id: attemptId,
      student_id: user.id,
      question_id: questionId,
      response: aiResult.data as unknown as Json,
      input_tokens: aiResult.usage.inputTokens,
      output_tokens: aiResult.usage.outputTokens,
      latency_ms: latencyMs,
    };

    const { error: insertError } = await supabase
      .from("question_tutor_cache")
      .insert(cachePayload);

    if (insertError) {
      // Log but do not fail the response — idempotent on duplicate constraint violation
      console.warn("[analytics/tutor] Cache insert failed:", insertError.message);
    }

    return { success: true, tutor: { ...aiResult.data, fromCache: false } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analytics] getQuestionTutorAction error:", message);
    return {
      success: false,
      error: "AI tutor is temporarily unavailable. Please try again later.",
    };
  }
}

