import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback route handler.
 *
 * Supabase Auth redirects here after:
 * - Email confirmation (registration)
 * - Password reset
 * - OAuth sign-in (future)
 *
 * Exchanges the one-time `code` for a session, then redirects the user
 * to their intended destination or the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Validate the `next` param is a relative path (prevents open redirect)
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Auth failed — redirect to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

