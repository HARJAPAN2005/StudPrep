import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDocumentIntelligencePipeline } from "../pipeline";
import {
  MockAIProvider,
  type GenerateStructuredParams,
  type StructuredResponse,
} from "../provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

describe("6-Stage Document Intelligence Pipeline", () => {
  let mockSupabase: SupabaseClient<Database>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "documents") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "doc-clean",
                    uploader_id: "user-1",
                    filename: "jamb-mathematics.pdf",
                    status: "ready",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "document_pages") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      page_number: 1,
                      extracted_text: "Quadratic equations: ax² + bx + c = 0. Worked problem 1.",
                    },
                    {
                      page_number: 2,
                      extracted_text: "Calculus integration and differential limits. Question 2.",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "material_analyses") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: "analysis-1",
                        document_id: "doc-clean",
                        uploader_id: "user-1",
                        version: 1,
                        status: "pending",
                        current_stage: 1,
                        stage_checkpoints: {},
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;
  });

  it("successfully processes clean PDF through all 6 bounded stages", async () => {
    const provider = new MockAIProvider();

    const report = await runDocumentIntelligencePipeline(mockSupabase, "doc-clean", {
      aiProvider: provider,
    });

    expect(report.classification.subject).toBe("General Mathematics");
    expect(report.classification.examinationType).toBe("JAMB_UTME");
    expect(report.topicsHierarchy.length).toBeGreaterThan(0);
    expect(report.extractedQuestions.length).toBeGreaterThan(0);
    expect(report.contentMap.coveragePercentage).toBeGreaterThan(0);
    expect(report.tokenUsage.totalTokens).toBeGreaterThan(0);

    // Verify stage 6 completion was written to database
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        current_stage: 6,
      })
    );
  });

  it("flags incomplete questions missing options", async () => {
    class IncompleteQuestionsMockProvider extends MockAIProvider {
      override async generateStructured<T>(
        params: GenerateStructuredParams<T>
      ): Promise<StructuredResponse<T>> {
        if (params.prompt.includes("Scan for questions")) {
          return {
            data: {
              detectedQuestions: [
                {
                  id: "q-incomplete",
                  questionNumber: "3",
                  body: "Incomplete question missing options C and D.",
                  options: [
                    { label: "A", text: "First option" },
                    { label: "B", text: "Second option" },
                  ],
                  instructions: null,
                  marks: 2,
                  containsTable: false,
                  containsEquation: false,
                  answerKey: null,
                  isComplete: false,
                  missingElements: ["option C", "option D"],
                  pageNumber: 2,
                },
              ],
              detectedAnswerKeySections: [],
            } as unknown as T,
            usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
            model: "mock-model",
          };
        }
        return super.generateStructured(params);
      }
    }

    const provider = new IncompleteQuestionsMockProvider();

    const report = await runDocumentIntelligencePipeline(mockSupabase, "doc-clean", {
      aiProvider: provider,
    });

    const incompleteWarning = report.extractionWarnings.find(
      (w) => w.code === "INCOMPLETE_QUESTION"
    );
    expect(incompleteWarning).toBeDefined();
    expect(incompleteWarning?.message).toContain("missing option C, option D");
  });

  it("resumes pipeline from stage checkpoint without re-running completed stages", async () => {
    const provider = new MockAIProvider();
    const generateSpy = vi.spyOn(provider, "generateStructured");

    // Mock analysis with already saved classification checkpoint
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "doc-clean", uploader_id: "user-1", filename: "doc.pdf" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "document_pages") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ page_number: 1, extracted_text: "Syllabus topic 1" }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "material_analyses") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "analysis-resumed",
                      document_id: "doc-clean",
                      uploader_id: "user-1",
                      version: 1,
                      status: "extracting_topics",
                      current_stage: 2,
                      stage_checkpoints: {
                        classification: {
                          subject: "Physics",
                          educationalLevel: "senior_secondary",
                          examinationType: "WAEC_WASSCE",
                          likelyLanguage: "English",
                          confidence: 0.98,
                          reasoning: "Checkpointed classification",
                        },
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      return {};
    }) as unknown as typeof mockSupabase.from;

    const report = await runDocumentIntelligencePipeline(mockSupabase, "doc-clean", {
      aiProvider: provider,
      resumeFromCheckpoint: true,
    });

    // Classification should be reused from checkpoint
    expect(report.classification.subject).toBe("Physics");
    expect(report.classification.reasoning).toBe("Checkpointed classification");

    // Stage 1 prompt should NOT have been sent
    const classificationCalls = generateSpy.mock.calls.filter((call) =>
      call[0].prompt.includes("Classify the following document")
    );
    expect(classificationCalls.length).toBe(0);
  });

  it("supports cancellation when cancelSignal is aborted", async () => {
    const provider = new MockAIProvider();
    const abortController = new AbortController();
    abortController.abort(); // Cancel immediately

    await expect(
      runDocumentIntelligencePipeline(mockSupabase, "doc-clean", {
        aiProvider: provider,
        cancelSignal: abortController.signal,
      })
    ).rejects.toThrow("cancelled by user request");
  });
});
