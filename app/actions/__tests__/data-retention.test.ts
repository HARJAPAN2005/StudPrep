import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteStudyMaterialAction,
  exportStudentDataAction,
  deleteStudentAccountAction,
} from "../data-retention";
import * as serverModule from "@/lib/supabase/server";
import * as authModule from "@/lib/auth/authorization";

const STUDENT_A = "00000000-0000-0000-0000-000000000001";
const STUDENT_B = "00000000-0000-0000-0000-000000000002";
const ADMIN_ID = "00000000-0000-0000-0000-000000000099";
const MATERIAL_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe("Data Retention & Privacy Server Actions", () => {
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

  describe("deleteStudyMaterialAction", () => {
    it("blocks unauthenticated callers", async () => {
      vi.spyOn(authModule, "requireUser").mockRejectedValue(
        new authModule.UnauthorizedError()
      );

      const res = await deleteStudyMaterialAction(MATERIAL_ID);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authentication required/i);
    });

    it("blocks cross-student material deletion (ownership check)", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: STUDENT_B });

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
          if (table === "documents") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: MATERIAL_ID,
                      uploader_id: STUDENT_A, // Owned by Student A!
                      storage_path: `${STUDENT_A}/notes.pdf`,
                      filename: "notes.pdf",
                    },
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

      const res = await deleteStudyMaterialAction(MATERIAL_ID);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cross-user access denied/i);
    });

    it("deletes storage object and database row when owner calls it", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: STUDENT_A });

      const removeStorageSpy = vi.fn().mockResolvedValue({ data: [], error: null });
      const deleteDbSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

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
          if (table === "documents") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: MATERIAL_ID,
                      uploader_id: STUDENT_A,
                      storage_path: `${STUDENT_A}/chemistry.pdf`,
                      filename: "chemistry.pdf",
                    },
                    error: null,
                  }),
                }),
              }),
              delete: deleteDbSpy,
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            remove: removeStorageSpy,
          }),
        },
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await deleteStudyMaterialAction(MATERIAL_ID);

      expect(res.success).toBe(true);
      expect(removeStorageSpy).toHaveBeenCalledWith([`${STUDENT_A}/chemistry.pdf`]);
      expect(deleteDbSpy).toHaveBeenCalled();
    });

    it("allows admin to delete any material and logs audit record", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: ADMIN_ID });

      const removeStorageSpy = vi.fn().mockResolvedValue({ data: [], error: null });
      const deleteDbSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const insertAuditSpy = vi.fn().mockResolvedValue({ error: null });

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
          if (table === "documents") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: MATERIAL_ID,
                      uploader_id: STUDENT_A,
                      storage_path: `${STUDENT_A}/spam.pdf`,
                      filename: "spam.pdf",
                    },
                    error: null,
                  }),
                }),
              }),
              delete: deleteDbSpy,
            };
          }
          if (table === "admin_audit_logs") {
            return {
              insert: insertAuditSpy,
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            remove: removeStorageSpy,
          }),
        },
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await deleteStudyMaterialAction(MATERIAL_ID);

      expect(res.success).toBe(true);
      expect(removeStorageSpy).toHaveBeenCalled();
      expect(deleteDbSpy).toHaveBeenCalled();
      expect(insertAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete_study_material",
          admin_id: ADMIN_ID,
        })
      );
    });
  });

  describe("exportStudentDataAction", () => {
    it("returns GDPR data export bundle for authenticated student", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: STUDENT_A });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: STUDENT_A,
                      full_name: "Alice Candidate",
                      role: "student",
                      avatar_url: null,
                      created_at: "2026-10-01T00:00:00Z",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "documents") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: MATERIAL_ID,
                      filename: "math.pdf",
                      file_size: 102400,
                      mime_type: "application/pdf",
                      status: "ready",
                      created_at: "2026-10-10T00:00:00Z",
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === "exam_attempts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "att-1",
                      snapshot_id: "snap-1",
                      status: "submitted",
                      score: 80,
                      accuracy: 85,
                      time_spent_seconds: 600,
                      submitted_at: "2026-10-15T00:00:00Z",
                      created_at: "2026-10-15T00:00:00Z",
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === "exam_integrity_events") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 2,
                  error: null,
                }),
              }),
            };
          }
          return {};
        }),
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await exportStudentDataAction();

      expect(res.success).toBe(true);
      expect(res.export).toBeDefined();
      expect(res.export?.studentId).toBe(STUDENT_A);
      expect(res.export?.profile?.fullName).toBe("Alice Candidate");
      expect(res.export?.documents.length).toBe(1);
      expect(res.export?.examAttempts.length).toBe(1);
      expect(res.export?.integrityEventsCount).toBe(2);
      expect(res.export?.disclaimer).toMatch(/no internal cryptographic hashes or answer keys/i);
    });
  });

  describe("deleteStudentAccountAction", () => {
    it("purges user storage files and deletes profile record", async () => {
      vi.spyOn(authModule, "requireUser").mockResolvedValue({ id: STUDENT_A });

      const removeStorageSpy = vi.fn().mockResolvedValue({ data: [], error: null });
      const deleteProfileSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const signOutSpy = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "documents") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ storage_path: `${STUDENT_A}/file1.pdf` }, { storage_path: `${STUDENT_A}/file2.pdf` }],
                  error: null,
                }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              delete: deleteProfileSpy,
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            remove: removeStorageSpy,
          }),
        },
        auth: {
          signOut: signOutSpy,
        },
      };
      // @ts-expect-error partial mock
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase);

      const res = await deleteStudentAccountAction();

      expect(res.success).toBe(true);
      expect(removeStorageSpy).toHaveBeenCalledWith([`${STUDENT_A}/file1.pdf`, `${STUDENT_A}/file2.pdf`]);
      expect(deleteProfileSpy).toHaveBeenCalled();
      expect(signOutSpy).toHaveBeenCalled();
    });
  });
});
