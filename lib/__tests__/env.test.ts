import { describe, it, expect } from "vitest";
import { env } from "../env";

describe("Typed Environment Configuration", () => {
  it("provides valid default public environment properties", () => {
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("StudPilot");
    expect(env.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });

  it("handles development node environment cleanly", () => {
    expect(["development", "test", "production"]).toContain(env.NODE_ENV);
  });
});
