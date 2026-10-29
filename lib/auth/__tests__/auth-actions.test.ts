import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginAction,
  registerAction,
  forgotPasswordAction,
  updateProfileAction,
} from "@/app/actions/auth";
import * as serverModule from "@/lib/supabase/server";

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

type MockedServerClient = Awaited<ReturnType<typeof serverModule.createClient>>;

describe("Authentication Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loginAction", () => {
    it("validates input and returns field errors for invalid email format", async () => {
      const formData = new FormData();
      formData.set("email", "not-an-email");
      formData.set("password", "short");

      const result = await loginAction(undefined, formData);
      expect(result?.errors?.email).toBeDefined();
    });

    it("returns error message when Supabase authentication fails", async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: "Invalid login credentials" },
          }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("email", "candidate@exam.ng");
      formData.set("password", "Password123");

      const result = await loginAction(undefined, formData);
      expect(result?.message).toContain("Invalid email or password");
    });

    it("redirects to /dashboard on successful login", async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" }, session: {} },
            error: null,
          }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("email", "candidate@exam.ng");
      formData.set("password", "Password123");

      await loginAction(undefined, formData);
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to safe relative redirectTo path", async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" }, session: {} },
            error: null,
          }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("email", "candidate@exam.ng");
      formData.set("password", "Password123");
      formData.set("redirectTo", "/exam/live-session-123");

      await loginAction(undefined, formData);
      expect(mockRedirect).toHaveBeenCalledWith("/exam/live-session-123");
    });

    it("prevents open redirect attacks by discarding absolute external URLs", async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" }, session: {} },
            error: null,
          }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("email", "candidate@exam.ng");
      formData.set("password", "Password123");
      formData.set("redirectTo", "https://malicious-phishing.com");

      await loginAction(undefined, formData);
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("registerAction", () => {
    it("validates registration inputs using RegisterSchema", async () => {
      const formData = new FormData();
      formData.set("full_name", "A"); // too short
      formData.set("email", "bad-email");
      formData.set("password", "123"); // too short and no letters

      const result = await registerAction(undefined, formData);
      expect(result?.errors?.full_name).toBeDefined();
      expect(result?.errors?.email).toBeDefined();
      expect(result?.errors?.password).toBeDefined();
    });

    it("handles already registered email conflict cleanly", async () => {
      const mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "User already registered" },
          }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("full_name", "Amaka Okafor");
      formData.set("email", "amaka@exam.ng");
      formData.set("password", "Secret1234");

      const result = await registerAction(undefined, formData);
      expect(result?.message).toContain("already exists");
    });

    it("returns success instructions when registration succeeds", async () => {
      const mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: "new-user-id" } },
            error: null,
          }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("full_name", "Amaka Okafor");
      formData.set("email", "amaka.new@exam.ng");
      formData.set("password", "Secret1234");

      const result = await registerAction(undefined, formData);
      expect(result?.success).toBe(true);
      expect(result?.message).toContain("Check your email to confirm");
    });
  });

  describe("forgotPasswordAction", () => {
    it("validates email before calling Supabase", async () => {
      const formData = new FormData();
      formData.set("email", "invalid-email");

      const result = await forgotPasswordAction(undefined, formData);
      expect(result?.errors?.email).toBeDefined();
    });

    it("returns generic message to prevent email enumeration", async () => {
      const mockSupabase = {
        auth: {
          resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("email", "unknown@exam.ng");

      const result = await forgotPasswordAction(undefined, formData);
      expect(result?.success).toBe(true);
      expect(result?.message).toContain("If that email is registered");
    });
  });

  describe("updateProfileAction & Role Protection", () => {
    it("rejects unauthenticated user attempting to update profile", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "No active session" },
          }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("full_name", "Chidi Nwosu");

      const result = await updateProfileAction(undefined, formData);
      expect(result?.message).toContain("must be logged in");
    });

    it("blocks student attempting to submit role in form data (self-elevation defense)", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "student-1" } },
            error: null,
          }),
        },
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("full_name", "Amaka Okafor");
      formData.set("role", "admin"); // Attacker attempting role elevation

      const result = await updateProfileAction(undefined, formData);
      expect(result?.message).toContain("Students cannot alter their own account role");
    });

    it("successfully updates full_name for authenticated student", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "student-1" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      };
      vi.spyOn(serverModule, "createClient").mockResolvedValue(mockSupabase as unknown as MockedServerClient);

      const formData = new FormData();
      formData.set("full_name", "Amaka Chidera Okafor");

      const result = await updateProfileAction(undefined, formData);
      expect(result?.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({ full_name: "Amaka Chidera Okafor" });
    });
  });
});
