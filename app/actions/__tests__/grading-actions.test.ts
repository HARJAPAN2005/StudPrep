import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  gradeAndFinalizeAttemptAction,
  getDetailedAttemptResultsAction,
  reportQuestionAction,
} from "../grading";
import * as serverModule from "@/lib/supabase/server";
import * as authModule from "@/lib/auth/authorization";

type MockedServerClient = Awaited<ReturnType<typeof serverModule.createClient>>;

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_ATTEMPT_ID = "11111111-1111-1111-1111-111111111111";
const MOCK_SNAPSHOT_ID = "22222222-2222-2222-2222-222222222222";

const MOCK_QUESTIONS = [
  {
    id: "q-1",
    body: "What is 2 + 2?",
    type: "single_choice",
    options: [
      { id: "opt-a", label: "A", text: "3" },
      { id: "opt-b", label: "B", text: "4" },
    ],
    correctOptionId: "opt-b",
    explanation: "2 + 2 equals 4.",
    difficulty: "easy",
    topicTags: ["Arithmetic"],
    marks: 2.0,
    negativeMarks: 0.5,
    sourceReference: { sourceType: "original_source", pageNumber: 1 },
    reviewStatus: "verified",
    validationIssues: [],
    orderIndex: 0,
    sectionId: null,
  },
];

describe("Grading and Results Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authModule, "requireUser").mockResolvedValue({
      id: MOCK_USER_ID,
      email: "candidate@studprep.ng",
    });
  });

  describe("gradeAndFinalizeAttemptAction", () => {
    it("grades an active attempt deterministically and records finalized score", async () => {
      const mockAttempt = {
        id: MOCK_ATTEMPT_ID,
        snapshot_id: MOCK_SNAPSHOT_ID,
        student_id: MOCK_USER_ID,
        status: "in_progress",
        started_at: "2026-10-30T10:00:00Z",
        answers: { "q-1": "opt-b" },
      };

      const mockSnapshot = {
        id: MOCK_SNAPSHOT_ID,
        title: "Mathematics Diagnostic",
        subject_id: "33333333-3333-3333-3333-333333333333",
        negative_marking: 0.5,
        sections: [],
        questions: MOCK_QUESTIONS,
      };

      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockAttempt, error: null }),
                    neq: vi.fn().mockReturnValue({
                      in: vi.fn().mockResolvedValue({ data: [] }), // No prior attempts
                    }),
                  }),
                }),
              }),
              update: updateSpy,
            };
          }
          if (table === "exam_snapshots") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const result = await gradeAndFinalizeAttemptAction(MOCK_ATTEMPT_ID);

      expect(result.success).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.grading.score).toBe(100);
      expect(result.payload?.grading.marksObtained).toBe(2.0);
      expect(result.payload?.comparison.isBaseline).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "submitted",
          score: 100,
          marks_obtained: 2.0,
        })
      );
    });

    it("is strictly idempotent: returns stored grade without recalculation if already submitted", async () => {
      const mockSubmittedAttempt = {
        id: MOCK_ATTEMPT_ID,
        snapshot_id: MOCK_SNAPSHOT_ID,
        student_id: MOCK_USER_ID,
        status: "submitted",
        score: 100,
        marks_obtained: 2.0,
        max_marks: 2.0,
        accuracy: 100,
        correct_count: 1,
        incorrect_count: 0,
        unanswered_count: 0,
        submitted_at: "2026-10-30T10:15:00Z",
        time_spent_seconds: 900,
        section_scores: {},
        topic_scores: {},
        detailed_results: [],
        attempt_number: 1,
      };

      const mockSnapshot = {
        id: MOCK_SNAPSHOT_ID,
        title: "Mathematics Diagnostic",
        questions: MOCK_QUESTIONS,
      };

      const updateSpy = vi.fn();

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockSubmittedAttempt, error: null }),
                    neq: vi.fn().mockReturnValue({
                      in: vi.fn().mockResolvedValue({ data: [] }),
                    }),
                  }),
                }),
              }),
              update: updateSpy,
            };
          }
          if (table === "exam_snapshots") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const result = await gradeAndFinalizeAttemptAction(MOCK_ATTEMPT_ID);

      expect(result.success).toBe(true);
      expect(result.payload?.grading.score).toBe(100);
      // update must NOT be called when idempotent
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("prevents cross-student grading access (returns error when student is not owner)", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              }),
            }),
          }),
        })),
      };

      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const result = await gradeAndFinalizeAttemptAction(MOCK_ATTEMPT_ID);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Examination attempt not found or access denied.");
    });
  });

  describe("getDetailedAttemptResultsAction", () => {
    it("locks results and hides answer keys while exam is in progress", async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const mockActiveAttempt = {
        id: MOCK_ATTEMPT_ID,
        student_id: MOCK_USER_ID,
        status: "in_progress",
        expires_at: futureDate,
      };

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockActiveAttempt, error: null }),
              }),
            }),
          }),
        })),
      };

      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const result = await getDetailedAttemptResultsAction(MOCK_ATTEMPT_ID);

      expect(result.success).toBe(false);
      expect(result.isLocked).toBe(true);
      expect(result.error).toContain("Results and answer keys are strictly protected");
    });
  });

  describe("reportQuestionAction", () => {
    it("allows candidates to report an ambiguous question on their own attempt", async () => {
      const mockAttempt = { id: MOCK_ATTEMPT_ID, student_id: MOCK_USER_ID };
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "rep-1" }, error: null }),
        }),
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockAttempt, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "reported_questions") {
            return { insert: insertSpy };
          }
          return {};
        }),
      };

      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const res = await reportQuestionAction({
        attemptId: MOCK_ATTEMPT_ID,
        questionId: "q-1",
        issueType: "ambiguous_question",
        comment: "Option A and B are identical in wording.",
      });

      expect(res.success).toBe(true);
      expect(res.reportId).toBe("rep-1");
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt_id: MOCK_ATTEMPT_ID,
          student_id: MOCK_USER_ID,
          question_id: "q-1",
          issue_type: "ambiguous_question",
        })
      );
    });

    it("rejects invalid input schema (e.g. unknown issue type)", async () => {
      const res = await reportQuestionAction({
        attemptId: MOCK_ATTEMPT_ID,
        questionId: "q-1",
        issueType: "unsupported_type" as unknown as "other",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});

