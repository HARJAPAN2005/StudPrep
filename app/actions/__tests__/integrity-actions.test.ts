import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  logIntegrityEventAction,
  getAttemptIntegritySummaryAction,
} from "../integrity";
import * as serverModule from "@/lib/supabase/server";
import * as authModule from "@/lib/auth/authorization";

const MOCK_STUDENT_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_STUDENT_ID = "00000000-0000-0000-0000-000000000002";
const ADMIN_ID = "00000000-0000-0000-0000-000000000099";
const MOCK_ATTEMPT_ID = "11111111-1111-1111-1111-111111111111";

describe("Examination Integrity Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default safe mock for createClient
    // @ts-expect-error partial mock
    vi.spyOn(serverModule, "createClient").mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  describe("logIntegrityEventAction", () => {
    it("returns error when unauthenticated", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(
        new authModule.UnauthorizedError("Unauthenticated")
      );

      const res = await logIntegrityEventAction({
        attemptId: MOCK_ATTEMPT_ID,
        eventType: "fullscreen_exit",
        metadata: {},
        clientTimestamp: new Date().toISOString(),
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/unauthenticated|unavailable/i);
    });

    it("rejects invalid event type via schema validation", async () => {
      const res = await logIntegrityEventAction({
        attemptId: MOCK_ATTEMPT_ID,
        // @ts-expect-error testing invalid event type
        eventType: "cheating_detected",
        clientTimestamp: new Date().toISOString(),
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("returns error when student does not own attempt", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: MOCK_STUDENT_ID });

      // Mock DB: attempt query returns null or error
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              }),
            }),
          }),
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await logIntegrityEventAction({
        attemptId: MOCK_ATTEMPT_ID,
        eventType: "fullscreen_exit",
        metadata: {},
        clientTimestamp: new Date().toISOString(),
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/not found or access denied/i);
    });

    it("returns error when attempt is already finalized", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: MOCK_STUDENT_ID });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: MOCK_ATTEMPT_ID, student_id: MOCK_STUDENT_ID, status: "submitted" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await logIntegrityEventAction({
        attemptId: MOCK_ATTEMPT_ID,
        eventType: "window_blur",
        metadata: {},
        clientTimestamp: new Date().toISOString(),
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/finalized exam/i);
    });

    it("successfully logs event for active attempt and returns warning count", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: MOCK_STUDENT_ID });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: MOCK_ATTEMPT_ID, student_id: MOCK_STUDENT_ID, status: "in_progress" },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "exam_integrity_events") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "evt-123" },
                    error: null,
                  }),
                }),
              }),
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    count: 3,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await logIntegrityEventAction({
        attemptId: MOCK_ATTEMPT_ID,
        eventType: "fullscreen_exit",
        metadata: {},
        clientTimestamp: new Date().toISOString(),
      });

      expect(res.success).toBe(true);
      expect(res.eventId).toBe("evt-123");
      expect(res.warningCount).toBe(3);
    });
  });

  describe("getAttemptIntegritySummaryAction", () => {
    it("blocks cross-student access for non-admin", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: MOCK_STUDENT_ID });

      const attemptQueryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Access forbidden" } }),
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { role: "student" }, error: null }),
                }),
              }),
            };
          }
          if (table === "exam_attempts") {
            return attemptQueryMock;
          }
          return {};
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await getAttemptIntegritySummaryAction(MOCK_ATTEMPT_ID);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/forbidden/i);
    });

    it("allows admin to view integrity summary and calculates reviewSuggested flag", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: ADMIN_ID });

      const mockEvents = [
        { id: "e1", attempt_id: MOCK_ATTEMPT_ID, student_id: OTHER_STUDENT_ID, event_type: "fullscreen_exit", metadata: {}, client_timestamp: "2026-10-30T10:01:00Z", created_at: "2026-10-30T10:01:01Z" },
        { id: "e2", attempt_id: MOCK_ATTEMPT_ID, student_id: OTHER_STUDENT_ID, event_type: "window_blur", metadata: {}, client_timestamp: "2026-10-30T10:02:00Z", created_at: "2026-10-30T10:02:01Z" },
        { id: "e3", attempt_id: MOCK_ATTEMPT_ID, student_id: OTHER_STUDENT_ID, event_type: "window_blur", metadata: {}, client_timestamp: "2026-10-30T10:03:00Z", created_at: "2026-10-30T10:03:01Z" },
        { id: "e4", attempt_id: MOCK_ATTEMPT_ID, student_id: OTHER_STUDENT_ID, event_type: "visibility_hidden", metadata: {}, client_timestamp: "2026-10-30T10:04:00Z", created_at: "2026-10-30T10:04:01Z" },
        { id: "e5", attempt_id: MOCK_ATTEMPT_ID, student_id: OTHER_STUDENT_ID, event_type: "fullscreen_exit", metadata: {}, client_timestamp: "2026-10-30T10:05:00Z", created_at: "2026-10-30T10:05:01Z" },
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
                }),
              }),
            };
          }
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: MOCK_ATTEMPT_ID, student_id: OTHER_STUDENT_ID },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "exam_integrity_events") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockEvents,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await getAttemptIntegritySummaryAction(MOCK_ATTEMPT_ID);

      expect(res.success).toBe(true);
      expect(res.summary).toBeDefined();
      expect(res.summary?.warningCount).toBe(5);
      expect(res.summary?.reviewSuggested).toBe(true);
      expect(res.summary?.fullscreenExits).toBe(2);
      expect(res.summary?.focusLossCount).toBe(2);
      expect(res.summary?.visibilityChanges).toBe(1);
    });
  });
});
