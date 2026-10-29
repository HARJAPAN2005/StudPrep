/**
 * AI Exam Generation & Verification Engine
 *
 * Implements the three exam creation modes:
 * 1. Recreate Source Paper (uses verified questions detected in source material)
 * 2. Generate Practice Exam (synthesizes new source-grounded questions)
 * 3. Mixed Exam (blends verified original questions and new practice questions)
 *
 * Enforces question verification, duplicate detection, option consistency,
 * and never silently invents a source answer key.
 *
 * @module lib/ai/exam-generator
 */
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getAIProvider, type AIProvider } from "./provider";
import { frameEvidence } from "./prompt-safety";
import {
  type StudioQuestion,
  type ExamConfiguration,
  type QuestionOption,
} from "@/lib/schemas/exam-studio";
import type { DetectedQuestion } from "./schemas";

export interface GenerationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a single studio question against pedagogical and CBT integrity rules.
 */
export function verifyStudioQuestion(q: StudioQuestion): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check stem
  if (!q.body || q.body.trim().length < 10) {
    issues.push("Question stem must be at least 10 characters.");
  }

  // Check options
  if (!q.options || q.options.length < 2) {
    issues.push("Question must have at least 2 options.");
  }

  // Verify answer key exists in options
  const correctOpt = q.options.find((opt) => opt.id === q.correctOptionId);
  if (!correctOpt) {
    issues.push("Specified answer key does not match any valid option ID.");
  }

  // Check for duplicate option texts
  const seenTexts = new Set<string>();
  for (const opt of q.options) {
    const normalized = opt.text.toLowerCase().trim();
    if (seenTexts.has(normalized)) {
      issues.push(`Duplicate option detected: "${opt.text}".`);
    }
    seenTexts.add(normalized);
  }

  // Check worked solution
  if (!q.explanation || q.explanation.trim().length < 5) {
    issues.push("Detailed worked explanation is missing or incomplete.");
  }

  // Source integrity
  if (
    q.sourceReference.sourceType === "original_source" &&
    !q.correctOptionId &&
    !correctOpt
  ) {
    issues.push("Original source question lacks a verified answer key in document text.");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Detects near-duplicate questions across a set using token overlap.
 */
export function detectDuplicateQuestions(questions: StudioQuestion[]): Map<string, string[]> {
  const duplicates = new Map<string, string[]>();

  const tokenize = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

  for (let i = 0; i < questions.length; i++) {
    const q1 = questions[i];
    const tokens1 = tokenize(q1.body);
    if (tokens1.size === 0) continue;

    for (let j = i + 1; j < questions.length; j++) {
      const q2 = questions[j];
      const tokens2 = tokenize(q2.body);
      if (tokens2.size === 0) continue;

      let intersection = 0;
      for (const t of tokens1) {
        if (tokens2.has(t)) intersection++;
      }

      const similarity = (2 * intersection) / (tokens1.size + tokens2.size);
      if (similarity > 0.85) {
        const list1 = duplicates.get(q1.id) || [];
        list1.push(q2.id);
        duplicates.set(q1.id, list1);

        const list2 = duplicates.get(q2.id) || [];
        list2.push(q1.id);
        duplicates.set(q2.id, list2);
      }
    }
  }

  return duplicates;
}

/**
 * Validates requested exam settings against available source material.
 */
export async function validateExamConfigurationAgainstSources(
  supabase: SupabaseClient<Database>,
  config: ExamConfiguration
): Promise<GenerationValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.materialIds.length === 0 && config.mode !== "generate_practice") {
    errors.push("At least one source material must be selected for Recreate or Mixed mode.");
    return { isValid: false, errors, warnings };
  }

  // If materials selected, fetch analyses to check available questions
  if (config.materialIds.length > 0) {
    const { data: analyses } = await supabase
      .from("material_analyses")
      .select("id, document_id, extracted_questions, status")
      .in("document_id", config.materialIds);

    const availableOriginalQuestions: DetectedQuestion[] = [];
    if (analyses) {
      for (const an of analyses) {
        if (Array.isArray(an.extracted_questions)) {
          availableOriginalQuestions.push(...(an.extracted_questions as unknown as DetectedQuestion[]));
        }
      }
    }

    if (config.mode === "recreate_source") {
      if (availableOriginalQuestions.length === 0) {
        errors.push("Selected materials do not contain any detected examination questions. Switch to Generate Practice Exam mode.");
      } else if (availableOriginalQuestions.length < config.questionCount) {
        warnings.push(
          `Requested ${config.questionCount} questions, but selected source materials only contain ${availableOriginalQuestions.length} detected questions. Consider Mixed mode or reducing question count.`
        );
      }
    }
  }

  const { easy, medium, hard } = config.difficultyDistribution;
  const sum = easy + medium + hard;
  if (sum !== 100) {
    warnings.push(`Difficulty percentages sum to ${sum}% instead of 100%. Distribution will be proportionally normalized.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

const BatchQuestionSchema = z.object({
  questions: z.array(
    z.object({
      body: z.string().min(10),
      type: z.enum(["single_choice", "true_false"]).default("single_choice"),
      options: z.array(
        z.object({
          label: z.string(),
          text: z.string(),
          explanation: z.string().optional(),
        })
      ).min(2),
      correctLabel: z.string(), // e.g. "A" or "True"
      explanation: z.string().min(10),
      difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
      topic: z.string().default("General"),
      evidenceCitation: z.string().optional(),
      pageNumber: z.number().int().positive().nullable().optional(),
    })
  ),
});

/**
 * Transforms detected source questions from Phase 5 into StudioQuestion records.
 */
export function transformDetectedQuestions(
  detectedQuestions: DetectedQuestion[],
  limit: number,
  marks = 1.0,
  negativeMarks = 0.0
): StudioQuestion[] {
  return detectedQuestions.slice(0, limit).map((dq, idx) => {
    const options: QuestionOption[] = (dq.options && dq.options.length > 0
      ? dq.options
      : [
          { label: "A", text: "True" },
          { label: "B", text: "False" },
        ]
    ).map((opt, oIdx) => ({
      id: `opt-${idx + 1}-${oIdx + 1}`,
      label: opt.label,
      text: opt.text,
      explanation: opt.label === dq.answerKey ? "Correct as stated in source document." : undefined,
    }));

    // Find matching correct option ID based on source answer key
    const matchedOption = options.find((o) => o.label.toUpperCase() === dq.answerKey?.toUpperCase()) || options[0];
    const isKeyMissing = !dq.answerKey;

    const issues: string[] = [];
    if (isKeyMissing) {
      issues.push("Original question lacks explicit answer key in document. Please review.");
    }
    if (!dq.isComplete) {
      issues.push(`Original question marked incomplete in document: missing ${dq.missingElements.join(", ")}.`);
    }

    const question: StudioQuestion = {
      id: `sq-${idx + 1}-${dq.id}`,
      body: dq.body,
      type: options.length === 2 && options[0].label === "A" && options[0].text === "True" ? "true_false" : "single_choice",
      options,
      correctOptionId: matchedOption.id,
      explanation: dq.answerKey
        ? `Verified original question from Page ${dq.pageNumber}. Source answer key: ${dq.answerKey}.`
        : `Original question from Page ${dq.pageNumber}. Requires manual review to confirm correct answer key.`,
      difficulty: "medium",
      topicTags: ["Original Source Paper"],
      marks,
      negativeMarks,
      sourceReference: {
        pageNumber: dq.pageNumber,
        evidenceSnippet: `Page ${dq.pageNumber} original question ${dq.questionNumber}`,
        sourceType: "original_source",
        originalQuestionNumber: dq.questionNumber,
      },
      reviewStatus: isKeyMissing || !dq.isComplete ? "flagged_review" : "verified",
      validationIssues: issues,
      orderIndex: idx,
    };

    return question;
  });
}

/**
 * Synthesizes new source-grounded practice questions using Gemini AI.
 */
export async function generatePracticeQuestionsWithAI(
  supabase: SupabaseClient<Database>,
  config: ExamConfiguration,
  targetCount: number,
  startIndex = 0,
  aiProvider?: AIProvider
): Promise<StudioQuestion[]> {
  const provider = aiProvider || getAIProvider();

  // Fetch page evidence from selected materials
  let evidenceText = "General syllabus curriculum scope for examination review.";
  let samplePageNumber: number | null = null;

  if (config.materialIds.length > 0) {
    const { data: pages } = await supabase
      .from("document_pages")
      .select("page_number, extracted_text")
      .in("document_id", config.materialIds)
      .order("page_number", { ascending: true })
      .limit(6);

    if (pages && pages.length > 0) {
      samplePageNumber = pages[0].page_number;
      evidenceText = frameEvidence(
        pages.map((p) => ({
          pageNumber: p.page_number,
          text: p.extracted_text,
        }))
      );
    }
  }

  const prompt = `Synthesize ${targetCount} high-fidelity examination multiple-choice questions grounded strictly in the provided curriculum evidence.

Evidence Context:
${evidenceText}

Requirements:
- Target Difficulty Breakdown: Easy: ${config.difficultyDistribution.easy}%, Medium: ${config.difficultyDistribution.medium}%, Hard: ${config.difficultyDistribution.hard}%
- Exactly 4 options for single_choice questions (A, B, C, D).
- Specify the correct label ("A", "B", "C", or "D").
- Provide a detailed worked solution in the explanation explaining why the correct option is true.
- Provide clear rationales for why distractors (incorrect options) are wrong.
- Ground every question in the evidence above.`;

  const response = await provider.generateStructured({
    systemPrompt:
      "You are a psychometric examination author for high-stakes examinations (JAMB UTME, WAEC WASSCE, ICAN). Generate rigorous, unambiguous questions grounded solely in the provided evidence. Never invent external facts.",
    prompt,
    schema: BatchQuestionSchema,
  });

  const rawList = response.data?.questions || [];
  const generatedQuestions: StudioQuestion[] = rawList.map((rawQ, idx) => {
    const qIndex = startIndex + idx;
    const options: QuestionOption[] = rawQ.options.map((opt, oIdx) => ({
      id: `opt-gen-${qIndex + 1}-${oIdx + 1}`,
      label: opt.label,
      text: opt.text,
      explanation: opt.explanation,
    }));

    const correct = options.find((o) => o.label.toUpperCase() === rawQ.correctLabel.toUpperCase()) || options[0];

    return {
      id: `sq-gen-${qIndex + 1}`,
      body: rawQ.body,
      type: rawQ.type,
      options,
      correctOptionId: correct.id,
      explanation: rawQ.explanation,
      difficulty: rawQ.difficulty,
      topicTags: [rawQ.topic],
      marks: config.marksPerQuestion,
      negativeMarks: config.negativeMarking,
      sourceReference: {
        pageNumber: rawQ.pageNumber ?? samplePageNumber ?? 1,
        evidenceSnippet: rawQ.evidenceCitation ?? "Grounded in reference syllabus section",
        sourceType: "ai_generated",
      },
      reviewStatus: "verified",
      validationIssues: [],
      orderIndex: qIndex,
    };
  });

  return generatedQuestions;
}

/**
 * Main orchestration function for generating questions across all 3 modes.
 */
export async function buildExamQuestionsForStudio(
  supabase: SupabaseClient<Database>,
  config: ExamConfiguration,
  aiProvider?: AIProvider
): Promise<StudioQuestion[]> {
  const resultQuestions: StudioQuestion[] = [];

  if (config.mode === "recreate_source" || config.mode === "mixed") {
    // Fetch detected questions
    const { data: analyses } = await supabase
      .from("material_analyses")
      .select("extracted_questions")
      .in("document_id", config.materialIds);

    const detected: DetectedQuestion[] = [];
    if (analyses) {
      for (const a of analyses) {
        if (Array.isArray(a.extracted_questions)) {
          detected.push(...(a.extracted_questions as unknown as DetectedQuestion[]));
        }
      }
    }

    if (config.mode === "recreate_source") {
      const transformed = transformDetectedQuestions(
        detected,
        config.questionCount,
        config.marksPerQuestion,
        config.negativeMarking
      );
      resultQuestions.push(...transformed);
    } else {
      // Mixed mode: take up to half from source, remaining from AI
      const sourceTarget = Math.min(Math.floor(config.questionCount / 2), detected.length);
      const transformed = transformDetectedQuestions(
        detected,
        sourceTarget,
        config.marksPerQuestion,
        config.negativeMarking
      );
      resultQuestions.push(...transformed);

      const remainingNeeded = config.questionCount - resultQuestions.length;
      if (remainingNeeded > 0) {
        const generated = await generatePracticeQuestionsWithAI(
          supabase,
          config,
          remainingNeeded,
          resultQuestions.length,
          aiProvider
        );
        resultQuestions.push(...generated);
      }
    }
  } else {
    // Generate Practice Exam
    const generated = await generatePracticeQuestionsWithAI(
      supabase,
      config,
      config.questionCount,
      0,
      aiProvider
    );
    resultQuestions.push(...generated);
  }

  // Verification step & duplicate check
  const duplicateMap = detectDuplicateQuestions(resultQuestions);
  for (const q of resultQuestions) {
    const verification = verifyStudioQuestion(q);
    const duplicates = duplicateMap.get(q.id);
    if (duplicates && duplicates.length > 0) {
      verification.issues.push(`Potential duplicate of question: ${duplicates.join(", ")}`);
    }

    q.validationIssues = [...new Set([...q.validationIssues, ...verification.issues])];
    if (q.validationIssues.length > 0 && q.reviewStatus !== "edited") {
      q.reviewStatus = "flagged_review";
    }
  }

  return resultQuestions;
}
