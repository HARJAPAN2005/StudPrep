/**
 * Bounded Multi-Stage Document Intelligence Pipeline
 *
 * ⚠️ SECURITY & STABILITY INVARIANTS ⚠️
 * 1. Bounded 6-stage architecture with checkpoint persistence for resumability.
 * 2. Long documents processed in overlapping bounded chunks to fit token limits.
 * 3. Document text framed as untrusted evidence with delimiter protection.
 * 4. Merging preserves source references and never silently deletes distinct questions.
 * 5. Strict Zod validation on every stage response.
 *
 * @module lib/ai/pipeline
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";
import { getAIProvider, type AIProvider, type AIUsageMetrics } from "./provider";
import {
  MaterialClassificationSchema,
  TopicHierarchySchema,
  QuestionDetectionSchema,
  ContentMapSchema,
  MaterialIntelligenceReportSchema,
  type MaterialIntelligenceReport,
  type MaterialClassification,
  type TopicItem,
  type DetectedQuestion,
  type ExtractionWarningItem,
  type ContentMap,
} from "./schemas";
import { frameEvidence } from "./prompt-safety";
import {
  createDocumentChunks,
  mergeTopicHierarchies,
  mergeDetectedQuestions,
  deduplicateWarnings,
  type PageEvidence,
} from "./chunking";
import { AISchemaValidationError } from "./errors";

export interface PipelineOptions {
  aiProvider?: AIProvider;
  resumeFromCheckpoint?: boolean;
  cancelSignal?: AbortSignal;
}

/**
 * Runs the complete 6-stage Document Intelligence Pipeline.
 */
export async function runDocumentIntelligencePipeline(
  supabase: SupabaseClient<Database>,
  documentId: string,
  options?: PipelineOptions
): Promise<MaterialIntelligenceReport> {
  const provider = options?.aiProvider || getAIProvider();
  const logPrefix = `[DocumentIntelligence docId=${documentId}]`;

  // 1. Fetch document and extracted pages
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, uploader_id, filename, status")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    throw new Error(`Document not found: ${docError?.message || "Missing record"}`);
  }

  const { data: rawPages, error: pagesError } = await supabase
    .from("document_pages")
    .select("page_number, extracted_text")
    .eq("document_id", documentId)
    .order("page_number", { ascending: true });

  if (pagesError || !rawPages || rawPages.length === 0) {
    throw new Error(`Document has no extracted pages. Ensure Phase 4 ingestion completed.`);
  }

  const pages: PageEvidence[] = rawPages.map((p) => ({
    pageNumber: p.page_number,
    text: p.extracted_text,
  }));

  // 2. Fetch or create material_analyses record
  let { data: analysis } = await supabase
    .from("material_analyses")
    .select("*")
    .eq("document_id", documentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!analysis) {
    const { data: newAnalysis, error: createError } = await supabase
      .from("material_analyses")
      .insert({
        document_id: documentId,
        uploader_id: document.uploader_id,
        version: 1,
        status: "pending",
        current_stage: 1,
      })
      .select()
      .single();

    if (createError || !newAnalysis) {
      throw new Error(`Failed to initialize material_analyses: ${createError?.message}`);
    }
    analysis = newAnalysis;
  }

  const checkpoints = (analysis.stage_checkpoints as Record<string, unknown>) || {};
  const totalUsage: AIUsageMetrics = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  const recordUsage = (u: AIUsageMetrics) => {
    totalUsage.inputTokens += u.inputTokens;
    totalUsage.outputTokens += u.outputTokens;
    totalUsage.totalTokens += u.totalTokens;
  };

  const checkCancellation = () => {
    if (options?.cancelSignal?.aborted) {
      throw new Error("Document analysis cancelled by user request.");
    }
  };

  try {
    // ── STAGE 1: Classify Material ───────────────────────────────────────────
    checkCancellation();
    let classification = checkpoints.classification as MaterialClassification | undefined;

    if (!classification || !options?.resumeFromCheckpoint) {
      await supabase
        .from("material_analyses")
        .update({ status: "classifying", current_stage: 1 })
        .eq("id", analysis.id);

      const samplePages = pages.slice(0, Math.min(pages.length, 3));
      const framedSample = frameEvidence(samplePages);

      const classResult = await provider.generateStructured({
        systemPrompt:
          "You are an academic curriculum classification expert for West African and professional examination boards (JAMB UTME, WAEC WASSCE, NECO SSCE, ICAN). Analyze the provided document evidence and infer the subject, educational level, examination type, and confidence.",
        prompt: `Classify the following document based on the extracted evidence:\n\n${framedSample}`,
        schema: MaterialClassificationSchema,
      });

      classification = classResult.data;
      recordUsage(classResult.usage);
      checkpoints.classification = classification;

      await supabase
        .from("material_analyses")
        .update({ stage_checkpoints: checkpoints as unknown as Json })
        .eq("id", analysis.id);

      console.info(`${logPrefix} Stage 1 complete: ${classification.subject} (${classification.examinationType})`);
    }

    // ── STAGE 2: Topic & Subtopic Hierarchy ──────────────────────────────────
    checkCancellation();
    let topicsHierarchy = checkpoints.topics as TopicItem[] | undefined;

    if (!topicsHierarchy || !options?.resumeFromCheckpoint) {
      await supabase
        .from("material_analyses")
        .update({ status: "extracting_topics", current_stage: 2 })
        .eq("id", analysis.id);

      const chunks = createDocumentChunks(pages, 5, 1);
      const chunkTopicLists: TopicItem[][] = [];

      for (const chunk of chunks) {
        checkCancellation();
        const framedChunk = frameEvidence(chunk.pages);

        const topicsResult = await provider.generateStructured({
          systemPrompt:
            "Extract a structured topic and subtopic hierarchy from the document evidence. For each subtopic, provide verbatim evidence citations and page numbers from the evidence blocks.",
          prompt: `Extract topics and subtopics from pages ${chunk.startPage} to ${chunk.endPage}:\n\n${framedChunk}`,
          schema: TopicHierarchySchema,
        });

        chunkTopicLists.push(topicsResult.data.topics);
        recordUsage(topicsResult.usage);
      }

      topicsHierarchy = mergeTopicHierarchies(chunkTopicLists);
      checkpoints.topics = topicsHierarchy;

      await supabase
        .from("material_analyses")
        .update({ stage_checkpoints: checkpoints as unknown as Json })
        .eq("id", analysis.id);

      console.info(`${logPrefix} Stage 2 complete: ${topicsHierarchy.length} topics extracted.`);
    }

    // ── STAGE 3: Detect Questions, Numbering, Options, & Answer Keys ──────────
    checkCancellation();
    let extractedQuestions = checkpoints.questions as DetectedQuestion[] | undefined;

    if (!extractedQuestions || !options?.resumeFromCheckpoint) {
      await supabase
        .from("material_analyses")
        .update({ status: "detecting_questions", current_stage: 3 })
        .eq("id", analysis.id);

      const chunks = createDocumentChunks(pages, 5, 1);
      const chunkQuestionLists: DetectedQuestion[][] = [];

      for (const chunk of chunks) {
        checkCancellation();
        const framedChunk = frameEvidence(chunk.pages);

        const qResult = await provider.generateStructured({
          systemPrompt:
            "Scan the evidence for original examination or revision questions, multiple-choice options (A,B,C,D), instructions, marks, tables, equations, and answer keys. Clearly mark isComplete=true only when stem and options are intact. If options or stems are truncated, set isComplete=false and list missingElements.",
          prompt: `Scan for questions on pages ${chunk.startPage} to ${chunk.endPage}:\n\n${framedChunk}`,
          schema: QuestionDetectionSchema,
        });

        chunkQuestionLists.push(qResult.data.detectedQuestions);
        recordUsage(qResult.usage);
      }

      extractedQuestions = mergeDetectedQuestions(chunkQuestionLists);
      checkpoints.questions = extractedQuestions;

      await supabase
        .from("material_analyses")
        .update({ stage_checkpoints: checkpoints as unknown as Json })
        .eq("id", analysis.id);

      console.info(`${logPrefix} Stage 3 complete: ${extractedQuestions.length} questions detected.`);
    }

    // ── STAGE 4: Source References & Extraction Warnings ─────────────────────
    checkCancellation();
    const warnings: ExtractionWarningItem[] = [];

    // Flag incomplete questions
    for (const q of extractedQuestions) {
      if (!q.isComplete) {
        warnings.push({
          code: "INCOMPLETE_QUESTION",
          pageNumber: q.pageNumber,
          message: `Question ${q.questionNumber} on page ${q.pageNumber} is incomplete: missing ${q.missingElements.join(", ")}.`,
          severity: "warning",
        });
      }
    }

    // Flag questions without answer key
    const questionsWithoutKey = extractedQuestions.filter((q) => !q.answerKey);
    if (questionsWithoutKey.length > 0) {
      warnings.push({
        code: "MISSING_ANSWER_KEYS",
        pageNumber: null,
        message: `${questionsWithoutKey.length} questions detected without explicit answer keys in document text.`,
        severity: "info",
      });
    }

    const deduplicatedWarningsList = deduplicateWarnings(warnings);
    checkpoints.warnings = deduplicatedWarningsList;

    // ── STAGE 5: Content Map (Coverage & Gaps) ────────────────────────────────
    checkCancellation();
    let contentMap = checkpoints.contentMap as ContentMap | undefined;

    if (!contentMap || !options?.resumeFromCheckpoint) {
      await supabase
        .from("material_analyses")
        .update({ status: "mapping_content", current_stage: 5 })
        .eq("id", analysis.id);

      const topicSummaries = topicsHierarchy
        .map((t) => `${t.title} (${t.subtopics.map((s) => s.title).join(", ")})`)
        .join("; ");

      const mapResult = await provider.generateStructured({
        systemPrompt:
          "Generate a concise curriculum content map showing estimated depth, coverage percentage against standard syllabus, identified gaps, and recommended prerequisites.",
        prompt: `Analyze curriculum coverage for Subject: ${classification.subject}, Exam: ${classification.examinationType}. Extracted topics: ${topicSummaries}`,
        schema: ContentMapSchema,
      });

      contentMap = mapResult.data;
      recordUsage(mapResult.usage);
      checkpoints.contentMap = contentMap;

      console.info(`${logPrefix} Stage 5 complete: ${contentMap.coveragePercentage}% estimated coverage.`);
    }

    // ── STAGE 6: Validation & Versioned Database Persistence ─────────────────
    checkCancellation();

    const finalReport: MaterialIntelligenceReport = {
      version: 1,
      classification,
      topicsHierarchy,
      extractedQuestions,
      contentMap,
      extractionWarnings: deduplicatedWarningsList,
      tokenUsage: totalUsage,
    };

    // Strict schema check on combined output
    const reportValidation = MaterialIntelligenceReportSchema.safeParse(finalReport);
    if (!reportValidation.success) {
      throw new AISchemaValidationError("Final intelligence report failed schema contract", [
        reportValidation.error.message,
      ]);
    }

    const warningMessages = deduplicatedWarningsList.map((w) => `[${w.code}] ${w.message}`);

    await supabase
      .from("material_analyses")
      .update({
        status: "completed",
        current_stage: 6,
        classification: classification as unknown as Json,
        topics_hierarchy: topicsHierarchy as unknown as Json,
        extracted_questions: extractedQuestions as unknown as Json,
        content_map: contentMap as unknown as Json,
        extraction_warnings: warningMessages,
        token_usage: totalUsage as unknown as Json,
        stage_checkpoints: checkpoints as unknown as Json,
        error_message: null,
      })
      .eq("id", analysis.id);

    console.info(`${logPrefix} Pipeline complete: 6 stages executed successfully.`);
    return reportValidation.data;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Pipeline failed at stage:`, errorMsg);

    await supabase
      .from("material_analyses")
      .update({
        status: "failed",
        error_message: errorMsg,
        stage_checkpoints: checkpoints as unknown as Json,
      })
      .eq("id", analysis.id);

    throw err;
  }
}
