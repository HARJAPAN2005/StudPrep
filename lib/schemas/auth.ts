/**
 * Zod schemas for authentication forms.
 *
 * @module lib/schemas/auth
 */
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const RegisterSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export const UpdateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** Standard action state returned by auth Server Actions */
export type AuthActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;
