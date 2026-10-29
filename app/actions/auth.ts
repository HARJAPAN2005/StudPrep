"use server";

/**
 * Authentication Server Actions
 *
 * All auth operations run server-side only.
 * Credentials are never sent to or processed on the client.
 *
 * @module app/actions/auth
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  UpdateProfileSchema,
  type AuthActionState,
} from "@/lib/schemas/auth";

/**
 * Login action — validates credentials and creates a Supabase session.
 * On success, redirects to /dashboard (or the requested redirectTo path).
 */
export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { message: "Invalid email or password. Please try again." };
  }

  const redirectTo = formData.get("redirectTo");
  redirect(
    typeof redirectTo === "string" && redirectTo.startsWith("/")
      ? redirectTo
      : "/dashboard"
  );
}

/**
 * Register action — creates a new Supabase Auth user.
 * Supabase will send a confirmation email.
 * The `handle_new_user` trigger auto-creates the profile row.
 */
export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    // Surface Supabase errors without leaking internal details
    if (error.message.includes("already registered")) {
      return { message: "An account with this email already exists." };
    }
    return { message: "Registration failed. Please try again." };
  }

  return {
    success: true,
    message:
      "Account created! Check your email to confirm your address before logging in.",
  };
}

/**
 * Forgot password action — sends a password reset email via Supabase Auth.
 */
export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = { email: formData.get("email") };

  const parsed = ForgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard/reset-password`,
    }
  );

  if (error) {
    return { message: "Failed to send reset email. Please try again." };
  }

  // Always return success even if email doesn't exist (prevents user enumeration)
  return {
    success: true,
    message: "If that email is registered, a reset link has been sent.",
  };
}

/**
 * Logout action — destroys the Supabase session and redirects to login.
 */
export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Update profile action — updates the user's display name.
 * Only operates on the currently authenticated user's own profile.
 */
export async function updateProfileAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = { full_name: formData.get("full_name") };

  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { message: "You must be logged in to update your profile." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    .eq("id", user.id);

  if (error) {
    return { message: "Failed to update profile. Please try again." };
  }

  return { success: true, message: "Profile updated successfully." };
}

