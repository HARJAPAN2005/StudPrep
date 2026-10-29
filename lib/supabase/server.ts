/**
 * Supabase Server Client
 *
 * Use this client in Server Components, Server Actions, and Route Handlers.
 * It reads/writes session cookies from the Next.js cookies() API.
 *
 * @module lib/supabase/server
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Creates a Supabase client for server-side use (RSC, Server Actions, Route Handlers).
 * Handles cookie-based session management automatically.
 *
 * @returns Supabase client with the calling user's session
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // Cookies can only be set from a Route Handler or Server Action.
            // This error is safe to ignore when only reading session data.
          }
        },
      },
    }
  );
}
