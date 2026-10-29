/**
 * Supabase Browser Client
 *
 * Use this client in Client Components only.
 * It reads session from HTTP-only cookies managed by @supabase/ssr.
 *
 * @module lib/supabase/client
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/**
 * Creates a Supabase client suitable for use in browser (Client Component) contexts.
 * Reads and writes session cookies automatically.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

