import { describe, it, expect } from "vitest";
import {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  UpdateProfileSchema,
} from "../auth";

describe("LoginSchema", () => {
  it("accepts valid email and password", () => {
    const result = LoginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = LoginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("RegisterSchema", () => {
  const valid = {
    full_name: "Amaka Okafor",
    email: "amaka@example.com",
    password: "SecurePass1",
  };

  it("accepts valid registration data", () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = RegisterSchema.safeParse({ ...valid, full_name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = RegisterSchema.safeParse({ ...valid, password: "Ab1" });
    expect(result.success).toBe(false);
  });

  it("rejects password with no numbers", () => {
    const result = RegisterSchema.safeParse({
      ...valid,
      password: "PasswordOnly",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password with no letters", () => {
    const result = RegisterSchema.safeParse({ ...valid, password: "12345678" });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from email", () => {
    const result = RegisterSchema.safeParse({
      ...valid,
      email: "  amaka@example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("amaka@example.com");
    }
  });
});

describe("ForgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(
      ForgotPasswordSchema.safeParse({ email: "user@test.com" }).success
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      ForgotPasswordSchema.safeParse({ email: "not-email" }).success
    ).toBe(false);
  });
});

describe("UpdateProfileSchema", () => {
  it("accepts a valid name", () => {
    expect(
      UpdateProfileSchema.safeParse({ full_name: "Chidi Okeke" }).success
    ).toBe(true);
  });

  it("rejects a name that is too short", () => {
    expect(UpdateProfileSchema.safeParse({ full_name: "C" }).success).toBe(
      false
    );
  });

  it("rejects a name that exceeds 100 characters", () => {
    expect(
      UpdateProfileSchema.safeParse({ full_name: "A".repeat(101) }).success
    ).toBe(false);
  });
});

