/**
 * Supabase Admin Client (Service Role)
 *
 * ⚠️  SECURITY CRITICAL ⚠️
 * This client uses the SERVICE ROLE KEY which BYPASSES all Row Level Security.
 * It must ONLY be imported in server-side files:
 *   - Route Handlers (app/api/*)
 *   - Server Actions ("use server")
 *   - Background job utilities
 *
 * NEVER import this in Client Components, and never import it in any module
 * that could be included in the browser bundle.
 *
 * @module lib/supabase/admin
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Creates a Supabase admin client with service role privileges.
 * This client bypasses RLS and should only be used for:
 * - AI question generation pipeline
 * - Exam session scoring (reading correct_index)
 * - System-initiated background operations
 *
 * @returns Supabase client with service role privileges
 * @throws {Error} If required environment variables are missing
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing required environment variables for Supabase admin client: " +
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

