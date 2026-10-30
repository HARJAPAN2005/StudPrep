"use server";

/**
 * Exam Configuration Studio Server Actions
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * - Enforces authenticated student sessions.
 * - Stores complete question bank (with answer keys and worked solutions) in
 *   protected server-side `exam_snapshots` records.
 * - Publishes immutable snapshots so that active exam attempts are isolated from
 *   subsequent template edits.
 *
 * @module app/actions/exam-studio
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/authorization";
import {
  ExamConfigurationSchema,
  StudioQuestionSchema,
  type ExamConfiguration,
  type StudioQuestion,
} from "@/lib/schemas/exam-studio";
import {
  buildExamQuestionsForStudio,
  validateExamConfigurationAgainstSources,
  generatePracticeQuestionsWithAI,
  verifyStudioQuestion,
} from "@/lib/ai/exam-generator";
import type { Json } from "@/types/supabase";

/**
 * Validates requested exam settings against source materials and psychometric rules.
 */
export async function validateExamSettingsAction(config: ExamConfiguration) {
  const supabase = await createClient();
  await requireUser(supabase);

  const parsed = ExamConfigurationSchema.safeParse(config);
  if (!parsed.success) {
    return {
      isValid: false,
      errors: parsed.error.issues.map((i) => i.message),
      warnings: [],
    };
  }

  return validateExamConfigurationAgainstSources(supabase, parsed.data);
}

/**
 * Generates an editable draft question set for the studio.
 */
export async function generateDraftQuestionsAction(
  config: ExamConfiguration
): Promise<{
  success: boolean;
  questions?: StudioQuestion[];
  error?: string;
  warnings?: string[];
}> {
  try {
    const supabase = await createClient();
    await requireUser(supabase);

    const parsed = ExamConfigurationSchema.safeParse(config);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join("; "),
      };
    }

    const validation = await validateExamConfigurationAgainstSources(supabase, parsed.data);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join("; "),
        warnings: validation.warnings,
      };
    }

    const questions = await buildExamQuestionsForStudio(supabase, parsed.data);
    return {
      success: true,
      questions,
      warnings: validation.warnings,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Regenerates a single question with fresh AI grounding.
 */
export async function regenerateSingleQuestionAction(
  config: ExamConfiguration,
  targetIndex: number
): Promise<{ success: boolean; question?: StudioQuestion; error?: string }> {
  try {
    const supabase = await createClient();
    await requireUser(supabase);

    const generatedList = await generatePracticeQuestionsWithAI(
      supabase,
      config,
      1,
      targetIndex
    );

    if (generatedList.length === 0) {
      return { success: false, error: "Failed to generate replacement question." };
    }

    const question = generatedList[0];
    question.orderIndex = targetIndex;
    return { success: true, question };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Publishes an immutable versioned exam snapshot.
 * Protected server-side record holding answer keys and explanations.
 */
export async function publishExamSnapshotAction(
  config: ExamConfiguration,
  questions: StudioQuestion[]
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const parsedConfig = ExamConfigurationSchema.safeParse(config);
    if (!parsedConfig.success) {
      return { success: false, error: "Invalid exam configuration structure." };
    }

    if (!questions || questions.length === 0) {
      return { success: false, error: "Exam must contain at least 1 question to publish." };
    }

    // Verify all questions
    for (const q of questions) {
      const qParsed = StudioQuestionSchema.safeParse(q);
      if (!qParsed.success) {
        return {
          success: false,
          error: `Question ${q.orderIndex + 1} failed schema validation: ${qParsed.error.issues.map((i) => i.message).join(", ")}`,
        };
      }
      const verify = verifyStudioQuestion(q);
      if (!verify.isValid) {
        return {
          success: false,
          error: `Question ${q.orderIndex + 1} has integrity errors: ${verify.issues.join(", ")}`,
        };
      }
    }

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const { data: snapshot, error: insertError } = await supabase
      .from("exam_snapshots")
      .insert({
        user_id: user.id,
        title: parsedConfig.data.title,
        subject_id: parsedConfig.data.subjectId,
        mode: parsedConfig.data.mode,
        duration_minutes: parsedConfig.data.durationMinutes,
        total_questions: questions.length,
        total_marks: totalMarks,
        negative_marking: parsedConfig.data.negativeMarking,
        sections: parsedConfig.data.sections as unknown as Json,
        questions: questions as unknown as Json,
      })
      .select("id")
      .single();

    if (insertError || !snapshot) {
      return {
        success: false,
        error: insertError?.message || "Failed to publish exam snapshot.",
      };
    }

    revalidatePath("/dashboard/exams/builder");
    return { success: true, snapshotId: snapshot.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Creates an active exam attempt linked to the immutable snapshot,
 * establishing a server-authoritative deadline and fixed question ordering.
 */
export async function launchExamAttemptAction(
  snapshotId: string
): Promise<{ success: boolean; attemptId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    const { data: snapshot, error: snapError } = await supabase
      .from("exam_snapshots")
      .select("id, duration_minutes, total_questions, questions")
      .eq("id", snapshotId)
      .single();

    if (snapError || !snapshot) {
      return { success: false, error: "Exam snapshot not found or access denied." };
    }

    const questions = snapshot.questions as unknown as StudioQuestion[];
    if (!questions || questions.length === 0) {
      return { success: false, error: "Snapshot contains no questions." };
    }

    // Fixed randomized question order for this attempt
    const questionIds = questions.map((q) => q.id);
    const shuffledQuestionIds = [...questionIds].sort(() => Math.random() - 0.5);

    // Fixed randomized option orders per question
    const optionOrders: Record<string, string[]> = {};
    for (const q of questions) {
      const optIds = q.options.map((o) => o.id);
      optionOrders[q.id] = [...optIds].sort(() => Math.random() - 0.5);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + snapshot.duration_minutes * 60 * 1000);

    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .insert({
        snapshot_id: snapshot.id,
        student_id: user.id,
        status: "in_progress",
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        question_order: shuffledQuestionIds as unknown as Json,
        option_orders: optionOrders as unknown as Json,
        answers: {} as unknown as Json,
        review_flags: {} as unknown as Json,
        visited_questions: { [shuffledQuestionIds[0]]: true } as unknown as Json,
      })
      .select("id")
      .single();

    if (attemptError || !attempt) {
      return {
        success: false,
        error: attemptError?.message || "Failed to initialize examination attempt.",
      };
    }

    return { success: true, attemptId: attempt.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

