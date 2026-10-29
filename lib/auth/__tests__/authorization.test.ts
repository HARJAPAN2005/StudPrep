import { describe, it, expect, vi } from "vitest";
import {
  getAuthenticatedUser,
  requireUser,
  getAuthenticatedProfile,
  requireAdmin,
  assertResourceOwnership,
  verifyDocumentAccess,
  verifyExamSessionAccess,
  verifyStoragePathAccess,
  preventRoleSelfElevation,
  UnauthorizedError,
  ForbiddenError,
} from "../authorization";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

describe("Server-Side Authorization Helpers", () => {
  describe("getAuthenticatedUser & requireUser", () => {
    it("returns user id and email when valid session is present", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-123", email: "student@exam.ng" } },
            error: null,
          }),
        },
      } as unknown as SupabaseClient<Database>;

      const user = await getAuthenticatedUser(mockSupabase);
      expect(user).toEqual({ id: "user-123", email: "student@exam.ng" });

      const requiredUser = await requireUser(mockSupabase);
      expect(requiredUser.id).toBe("user-123");
    });

    it("returns null from getAuthenticatedUser when session is absent (anonymous)", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as unknown as SupabaseClient<Database>;

      const user = await getAuthenticatedUser(mockSupabase);
      expect(user).toBeNull();
    });

    it("throws UnauthorizedError from requireUser when session is absent or invalid", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Invalid session token" },
          }),
        },
      } as unknown as SupabaseClient<Database>;

      await expect(requireUser(mockSupabase)).rejects.toThrow(UnauthorizedError);
    });

    it("fetches profile with getAuthenticatedProfile", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-123", email: "student@exam.ng" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "user-123",
                  role: "student",
                  full_name: "Amaka",
                  avatar_url: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      const profile = await getAuthenticatedProfile(mockSupabase);
      expect(profile).toBeDefined();
      expect(profile?.full_name).toBe("Amaka");
      expect(profile?.email).toBe("student@exam.ng");
    });
  });

  describe("requireAdmin", () => {
    it("succeeds when user is authenticated with admin role", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-1", email: "admin@studpilot.ng" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "admin-1",
                  role: "admin",
                  full_name: "Staff Moderator",
                  avatar_url: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      const profile = await requireAdmin(mockSupabase);
      expect(profile.role).toBe("admin");
      expect(profile.id).toBe("admin-1");
    });

    it("throws ForbiddenError when authenticated user is a student", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "student-1", email: "student@studpilot.ng" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "student-1",
                  role: "student",
                  full_name: "Amaka",
                  avatar_url: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      await expect(requireAdmin(mockSupabase)).rejects.toThrow(ForbiddenError);
    });

    it("throws UnauthorizedError when user is not signed in", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as unknown as SupabaseClient<Database>;

      await expect(requireAdmin(mockSupabase)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("assertResourceOwnership (Cross-User Access Prevention)", () => {
    it("allows access when currentUserId matches ownerId", () => {
      expect(() => {
        assertResourceOwnership("student-abc", "student-abc", false);
      }).not.toThrow();
    });

    it("allows access when user is administrator regardless of ownerId", () => {
      expect(() => {
        assertResourceOwnership("student-abc", "admin-xyz", true);
      }).not.toThrow();
    });

    it("strictly blocks cross-user access when student A attempts to access student B's record", () => {
      expect(() => {
        assertResourceOwnership("student-b", "student-a", false);
      }).toThrow(ForbiddenError);
    });
  });

  describe("verifyDocumentAccess", () => {
    it("returns document when owned by current student", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "doc-1",
                  uploader_id: "student-1",
                  filename: "jamb-physics.pdf",
                  storage_path: "student-1/jamb-physics.pdf",
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      const doc = await verifyDocumentAccess(mockSupabase, "doc-1", "student-1");
      expect(doc.id).toBe("doc-1");
      expect(doc.filename).toBe("jamb-physics.pdf");
    });

    it("blocks student A from accessing student B's document by ID", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "doc-secret",
                  uploader_id: "student-b",
                  filename: "waec-prep.pdf",
                  storage_path: "student-b/waec-prep.pdf",
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      await expect(
        verifyDocumentAccess(mockSupabase, "doc-secret", "student-a", false)
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws ForbiddenError when document record does not exist in database", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Row not found" },
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      await expect(
        verifyDocumentAccess(mockSupabase, "non-existent-id", "student-1")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("verifyExamSessionAccess", () => {
    it("allows student to access their own exam session", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "session-1",
                  student_id: "student-1",
                  status: "active",
                  subject_id: "subj-math",
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      const session = await verifyExamSessionAccess(mockSupabase, "session-1", "student-1");
      expect(session.id).toBe("session-1");
    });

    it("prevents student A from tampering with or accessing student B's exam session", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "session-other",
                  student_id: "student-b",
                  status: "active",
                  subject_id: "subj-eng",
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      await expect(
        verifyExamSessionAccess(mockSupabase, "session-other", "student-a", false)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("verifyStoragePathAccess (Materials Storage Isolation)", () => {
    it("authorizes file path in the authenticated student's own folder", () => {
      expect(verifyStoragePathAccess("student-123/notes.pdf", "student-123")).toBe(true);
    });

    it("blocks student attempting to access another student's storage directory", () => {
      expect(() => {
        verifyStoragePathAccess("student-456/notes.pdf", "student-123");
      }).toThrow(ForbiddenError);
    });

    it("blocks path traversal attacks (../)", () => {
      expect(() => {
        verifyStoragePathAccess("student-123/../../sensitive.pdf", "student-123");
      }).toThrow(ForbiddenError);

      expect(() => {
        verifyStoragePathAccess("../root.pdf", "student-123");
      }).toThrow(ForbiddenError);
    });

    it("blocks invalid root or slash formats", () => {
      expect(() => {
        verifyStoragePathAccess("/student-123/notes.pdf", "student-123");
      }).toThrow(ForbiddenError);

      expect(() => {
        verifyStoragePathAccess("student-123\\notes.pdf", "student-123");
      }).toThrow(ForbiddenError);
    });

    it("allows administrators to access any student folder", () => {
      expect(verifyStoragePathAccess("student-456/notes.pdf", "admin-1", true)).toBe(true);
    });
  });

  describe("preventRoleSelfElevation", () => {
    it("allows student to keep their existing role", () => {
      expect(() => {
        preventRoleSelfElevation("student", "student");
      }).not.toThrow();
    });

    it("strictly blocks a student from self-elevating to admin", () => {
      expect(() => {
        preventRoleSelfElevation("admin", "student");
      }).toThrow(ForbiddenError);
    });

    it("allows an admin to retain or manage roles", () => {
      expect(() => {
        preventRoleSelfElevation("student", "admin");
      }).not.toThrow();
    });
  });
});
