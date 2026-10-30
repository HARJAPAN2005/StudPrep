import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAnalyticsDashboardAction,
  generateRevisionPlanAction,
  getQuestionTutorAction,
} from "../analytics";
import * as serverModule from "@/lib/supabase/server";
import * as authModule from "@/lib/auth/authorization";
import * as providerModule from "@/lib/ai/provider";
import { MockAIProvider } from "@/lib/ai/provider";

// ── Constants ────────────────────────────────────────────────────────────────

const MOCK_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const MOCK_ATTEMPT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const MOCK_SNAPSHOT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const MOCK_SUBJECT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const MOCK_QUESTION_ID = "q-001";

// ── Mock helpers ─────────────────────────────────────────────────────────────

const makeDetailedResult = (overrides: Partial<Record<string, unknown>> = {}) => ({
  questionId: MOCK_QUESTION_ID,
  questionIndex: 0,
  isAttempted: true,
  isCorrect: true,
  submittedLabel: "A",
  correctLabel: "A",
  marksAwarded: 2,
  maxMarks: 2,
  negativeMarks: 0.5,
  topicTags: ["Algebra"],
  difficulty: "medium",
  sourceReference: "Page 5",
  questionSnapshot: {
    body: "What is x if 2x = 4?",
    options: [
      { label: "A", text: "2" },
      { label: "B", text: "4" },
    ],
  },
  ...overrides,
});

const makeAttempt = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: MOCK_ATTEMPT_ID,
  snapshot_id: MOCK_SNAPSHOT_ID,
  student_id: MOCK_USER_ID,
  status: "submitted",
  score: 80,
  marks_obtained: 16,
  max_marks: 20,
  accuracy: 80,
  correct_count: 8,
  incorrect_count: 2,
  unanswered_count: 0,
  time_spent_seconds: 1200,
  attempt_number: 1,
  submitted_at: "2026-10-20T10:00:00Z",
  detailed_results: [makeDetailedResult()],
  topic_scores: {},
  section_scores: {},
  ...overrides,
});

const makeSnapshot = () => ({
  id: MOCK_SNAPSHOT_ID,
  title: "Algebra Practice Test",
  subject_id: MOCK_SUBJECT_ID,
  mode: "generate_practice",
  total_questions: 10,
});

const makeSubject = () => ({
  id: MOCK_SUBJECT_ID,
  name: "Mathematics",
  is_archived: false,
});

// ── Supabase mock factory ────────────────────────────────────────────────────

function buildSupabaseMock({
  attempts = [makeAttempt()],
  snapshots = [makeSnapshot()],
  subjects = [makeSubject()],
  tutorCache = null as Record<string, unknown> | null,
  insertError = null as { message: string } | null,
}: {
  attempts?: ReturnType<typeof makeAttempt>[];
  snapshots?: ReturnType<typeof makeSnapshot>[];
  subjects?: ReturnType<typeof makeSubject>[];
  tutorCache?: Record<string, unknown> | null;
  insertError?: { message: string } | null;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "exam_attempts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: attempts, error: null }),
              }),
              // For .eq("student_id").eq("id").single() in getQuestionTutorAction
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: attempts[0] ?? null,
                  error: attempts.length === 0 ? { message: "Not found" } : null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "exam_snapshots") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: snapshots, error: null }),
          }),
        };
      }

      if (table === "subjects") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: subjects, error: null }),
          }),
        };
      }

      if (table === "question_tutor_cache") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: tutorCache,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: insertError }),
        };
      }

      return {};
    }),
  };
}

// ── Test setup ───────────────────────────────────────────────────────────────

describe("Analytics Server Actions", () => {
  let mockAI: MockAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authModule, "requireUser").mockResolvedValue({
      id: MOCK_USER_ID,
      email: "student@studprep.ng",
    });

    mockAI = new MockAIProvider();
    vi.spyOn(providerModule, "getAIProvider").mockReturnValue(mockAI);
  });

  // ── getAnalyticsDashboardAction ──────────────────────────────────────────

  describe("getAnalyticsDashboardAction", () => {
    it("returns empty dashboard when student has no finalized attempts", async () => {
      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({ attempts: [] }) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );

      const result = await getAnalyticsDashboardAction();

      expect(result.success).toBe(true);
      expect(result.payload?.hasData).toBe(false);
      expect(result.payload?.totalExams).toBe(0);
      expect(result.payload?.examHistory).toHaveLength(0);
      expect(result.payload?.topicAnalytics).toHaveLength(0);
    });

    it("builds dashboard payload from finalized attempt data", async () => {
      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({}) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );

      const result = await getAnalyticsDashboardAction();

      expect(result.success).toBe(true);
      expect(result.payload?.hasData).toBe(true);
      expect(result.payload?.totalExams).toBe(1);
      expect(result.payload?.examHistory).toHaveLength(1);
      expect(result.payload?.examHistory[0].title).toBe("Algebra Practice Test");
      expect(result.payload?.examHistory[0].score).toBe(80);
    });

    it("returns error when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new Error("Unauthorized"));

      const result = await getAnalyticsDashboardAction();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("returns error when DB query fails", async () => {
      vi.spyOn(serverModule, "createClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

      const result = await getAnalyticsDashboardAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to load");
    });

    it("computes topicAnalytics with isLowSample=true when fewer than 5 questions", async () => {
      // Single question => below MIN_RELIABLE_SAMPLE threshold
      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({}) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );

      const result = await getAnalyticsDashboardAction();

      const algebraTopic = result.payload?.topicAnalytics.find((t) => t.topic === "Algebra");
      expect(algebraTopic?.isLowSample).toBe(true);
      // Single question → totalQuestions = 1 < 5
      expect(algebraTopic?.totalQuestions).toBe(1);
    });

    it("uses 'General' fallback topic tag when topicTags is empty", async () => {
      const attemptNoTag = makeAttempt({
        detailed_results: [makeDetailedResult({ topicTags: [] })],
      });

      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({ attempts: [attemptNoTag] }) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );

      const result = await getAnalyticsDashboardAction();

      const generalTopic = result.payload?.topicAnalytics.find((t) => t.topic === "General");
      expect(generalTopic).toBeDefined();
    });

    it("aggregates data correctly across multiple attempts", async () => {
      const attempt1 = makeAttempt({
        id: "attempt-001",
        submitted_at: "2026-10-10T10:00:00Z",
        score: 60,
        correct_count: 6,
        incorrect_count: 4,
        unanswered_count: 0,
        detailed_results: [makeDetailedResult({ isCorrect: true, topicTags: ["Calculus"] })],
      });
      const attempt2 = makeAttempt({
        id: "attempt-002",
        submitted_at: "2026-10-20T10:00:00Z",
        score: 80,
        correct_count: 8,
        incorrect_count: 2,
        unanswered_count: 0,
        detailed_results: [makeDetailedResult({ isCorrect: false, isAttempted: true, topicTags: ["Calculus"] })],
      });

      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({ attempts: [attempt1, attempt2] }) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );

      const result = await getAnalyticsDashboardAction();

      expect(result.payload?.totalExams).toBe(2);
      // examHistory sorted newest first
      expect(result.payload?.examHistory[0].score).toBe(80);
      expect(result.payload?.examHistory[1].score).toBe(60);

      const calculus = result.payload?.topicAnalytics.find((t) => t.topic === "Calculus");
      expect(calculus?.totalQuestions).toBe(2);
    });

    it("trendSufficient is false when fewer than 3 exams", async () => {
      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({}) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );

      const result = await getAnalyticsDashboardAction();

      expect(result.payload?.trendSufficient).toBe(false); // only 1 exam in mock
    });
  });

  // ── generateRevisionPlanAction ───────────────────────────────────────────

  describe("generateRevisionPlanAction", () => {
    it("returns error when student has no exam history", async () => {
      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({ attempts: [] }) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );

      const result = await generateRevisionPlanAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Complete at least one exam/i);
    });

    it("returns error when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(new Error("Unauthorized"));

      const result = await generateRevisionPlanAction();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("returns error when AI provider fails", async () => {
      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({}) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );
      mockAI.shouldFailProvider = true;

      const result = await generateRevisionPlanAction();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/temporarily unavailable/i);
    });

    it("generates a revision plan with valid AI response", async () => {
      vi.spyOn(serverModule, "createClient").mockResolvedValue(
        buildSupabaseMock({}) as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never
      );

      // Provide deterministic mock AI response matching RevisionPlanOutputSchema
      const mockPlan = {
        summary: "Focus on Algebra and practice more difficult questions.",
        recommendations: [
          {
            priority: "high" as const,
            topic: "Algebra",
            subject: "Mathematics",
            accuracy: 50,
            rationale: "Only 50% accuracy on this topic.",
            suggestedActions: ["Revise factorisation methods", "Practice 20 quadratic equations"],
            isLowSampleWarning: true,
          },
        ],
        suggestedPracticeSessionCount: 5,
        disclaimer: "This plan is AI-generated and based on limited data. Verify with your tutor.",
        generatedAt: new Date().toISOString(),
      };

      mockAI.setMockResponse("revision-plan", mockPlan);
      vi.spyOn(mockAI, "generateStructured").mockResolvedValue({
        data: mockPlan,
        usage: { inputTokens: 500, outputTokens: 300, totalTokens: 800 },
        model: "mock-gemini-flash",
      });

      const result = await generateRevisionPlanAction();

      expect(result.success).toBe(true);
      expect(result.plan?.recommendations).toHaveLength(1);
      expect(result.plan?.recommendations[0].topic).toBe("Algebra");
      expect(result.plan?.disclaimer).toBeTruthy();
    });
  });

  // ── getQuestionTutorAction ───────────────────────────────────────────────

  describe("getQuestionTutorAction", () => {
    it("returns error when attempt not found", async () => {
      vi.spyOn(serverModule, "createClient").mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

      const result = await getQuestionTutorAction(MOCK_ATTEMPT_ID, MOCK_QUESTION_ID);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|access denied/i);
    });

    it("blocks tutor access during an in-progress exam", async () => {
      const activeAttempt = makeAttempt({ status: "in_progress" });

      vi.spyOn(serverModule, "createClient").mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: activeAttempt, error: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

      const result = await getQuestionTutorAction(MOCK_ATTEMPT_ID, MOCK_QUESTION_ID);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/submitted|after you have submitted/i);
    });

    it("returns cached response on second request without calling AI again", async () => {
      const cachedTutor = {
        questionId: MOCK_QUESTION_ID,
        whyCorrectIsRight: "Option A is correct because 2x=4 means x=2.",
        whyStudentWasWrong: null,
        coreConceptExplained: "Linear equations balancing principle.",
        simplerAnalogy: "Like balancing a scale.",
        practiceSuggestion: "Solve 10 more linear equations.",
        sourceBoundNote: "Based on uploaded syllabus material.",
        uncertaintyLevel: "verified_source" as const,
        fromCache: false,
      };

      const generateSpy = vi.spyOn(mockAI, "generateStructured");

      vi.spyOn(serverModule, "createClient").mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: makeAttempt(), error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "question_tutor_cache") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: { response: cachedTutor }, error: null }),
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

      const result = await getQuestionTutorAction(MOCK_ATTEMPT_ID, MOCK_QUESTION_ID);

      expect(result.success).toBe(true);
      expect(result.tutor?.fromCache).toBe(true);
      // AI must NOT be called when cache hit
      expect(generateSpy).not.toHaveBeenCalled();
    });

    it("calls AI when no cache exists and caches the result", async () => {
      const tutorResponse = {
        questionId: MOCK_QUESTION_ID,
        whyCorrectIsRight: "Option A is correct because 2x=4 means x=2.",
        whyStudentWasWrong: null,
        coreConceptExplained: "Linear equations balancing principle.",
        simplerAnalogy: "Like balancing a scale.",
        practiceSuggestion: "Solve 10 more linear equations.",
        sourceBoundNote: "Based on general mathematical knowledge.",
        uncertaintyLevel: "general_knowledge" as const,
        fromCache: false,
      };

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const generateSpy = vi.spyOn(mockAI, "generateStructured").mockResolvedValue({
        data: tutorResponse,
        usage: { inputTokens: 300, outputTokens: 200, totalTokens: 500 },
        model: "mock-gemini-flash",
      });

      vi.spyOn(serverModule, "createClient").mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: makeAttempt(), error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "question_tutor_cache") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // no cache
                    }),
                  }),
                }),
              }),
              insert: insertSpy,
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

      const result = await getQuestionTutorAction(MOCK_ATTEMPT_ID, MOCK_QUESTION_ID);

      expect(result.success).toBe(true);
      expect(result.tutor?.fromCache).toBe(false);
      expect(generateSpy).toHaveBeenCalledOnce();
      expect(insertSpy).toHaveBeenCalledOnce(); // cached after generation
    });

    it("returns graceful error when AI provider fails (no crash)", async () => {
      mockAI.shouldFailProvider = true;

      vi.spyOn(serverModule, "createClient").mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: makeAttempt(), error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "question_tutor_cache") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

      const result = await getQuestionTutorAction(MOCK_ATTEMPT_ID, MOCK_QUESTION_ID);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/temporarily unavailable/i);
    });

    it("returns error when question is not in attempt's detailed_results", async () => {
      const attemptWithoutQuestion = makeAttempt({
        detailed_results: [makeDetailedResult({ questionId: "different-question-id" })],
      });

      vi.spyOn(serverModule, "createClient").mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: attemptWithoutQuestion, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "question_tutor_cache") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

      const result = await getQuestionTutorAction(MOCK_ATTEMPT_ID, MOCK_QUESTION_ID);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Question not found/i);
    });

    it("blocks cross-student access when student_id doesn't match", async () => {
      // Auth returns MOCK_USER_ID but attempt belongs to OTHER_USER_ID
      // The .eq("student_id", user.id) filter will return no row
      vi.spyOn(serverModule, "createClient").mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    // Simulates RLS blocking cross-student access: null data
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: "Row not found" },
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

      // Log auth as OTHER_USER_ID trying to access MOCK_USER_ID's attempt
      vi.spyOn(authModule, "requireUser").mockResolvedValue({
        id: OTHER_USER_ID,
        email: "other@studprep.ng",
      });

      const result = await getQuestionTutorAction(MOCK_ATTEMPT_ID, MOCK_QUESTION_ID);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|access denied/i);
    });

    it("returns error for invalid UUID attemptId", async () => {
      const result = await getQuestionTutorAction("not-a-uuid", MOCK_QUESTION_ID);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid request/i);
    });
  });
});

