"use server";

/**
 * Examination Integrity Event Logging Actions
 *
 * ⚠️ SECURITY & INTEGRITY CRITICAL ⚠️
 * 1. Ownership Verification: Students can only log integrity events for their own attempt.
 * 2. Privacy Conscious: Telemetry captures non-invasive window and visibility state changes
 *    without invasive video/audio or device fingerprinting.
 * 3. Non-Punitive: Browser events are logged as signals for examiner review, never as automated
 *    proof of cheating.
 *
 * @module app/actions/integrity
 */

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/authorization";
import {
  LogIntegrityEventInputSchema,
  type LogIntegrityEventInput,
  type IntegritySummary,
  type IntegrityEventRecord,
} from "@/lib/schemas/integrity";
import type { Json } from "@/types/supabase";

/**
 * Logs a single examination integrity event (e.g. fullscreen transition, window focus change).
 */
export async function logIntegrityEventAction(
  input: LogIntegrityEventInput
): Promise<{
  success: boolean;
  eventId?: string;
  warningCount?: number;
  error?: string;
}> {
  try {
    const parsed = LogIntegrityEventInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Invalid event payload" };
    }

    const { attemptId, eventType, metadata, clientTimestamp } = parsed.data;

    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Verify ownership: attempt must belong to this student
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("id, student_id, status")
      .eq("id", attemptId)
      .eq("student_id", user.id)
      .single();

    if (attemptError || !attempt) {
      return { success: false, error: "Exam attempt not found or access denied." };
    }

    // Only active attempts can record real-time integrity events
    if (attempt.status !== "in_progress" && attempt.status !== "not_started") {
      return { success: false, error: "Cannot record integrity events on a finalized exam." };
    }

    // Record the event
    const { data: inserted, error: insertError } = await supabase
      .from("exam_integrity_events")
      .insert({
        attempt_id: attemptId,
        student_id: user.id,
        event_type: eventType,
        metadata: metadata as Json,
        client_timestamp: clientTimestamp,
      })
      .select("id")
      .single();

    if (insertError) {
      console.warn("[integrity] Failed to record event:", insertError.message);
      return { success: false, error: "Failed to persist integrity signal." };
    }

    // Query warning count for this attempt (focus loss, visibility hidden, fullscreen exit)
    const { count } = await supabase
      .from("exam_integrity_events")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", attemptId)
      .in("event_type", ["fullscreen_exit", "visibility_hidden", "window_blur"]);

    return {
      success: true,
      eventId: inserted.id,
      warningCount: count ?? 1,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[integrity] logIntegrityEventAction error:", msg);
    return { success: false, error: "Integrity service unavailable." };
  }
}

/**
 * Retrieves the integrity audit summary for a given attempt.
 * Students can view their own attempt; Admins can view any attempt.
 */
export async function getAttemptIntegritySummaryAction(
  attemptId: string
): Promise<{
  success: boolean;
  summary?: IntegritySummary;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Check user profile for admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    // Check ownership unless admin
    let attemptQuery = supabase
      .from("exam_attempts")
      .select("id, student_id")
      .eq("id", attemptId);

    if (!isAdmin) {
      attemptQuery = attemptQuery.eq("student_id", user.id);
    }

    const { data: attempt, error: attemptError } = await attemptQuery.single();

    if (attemptError || !attempt) {
      return { success: false, error: "Attempt not found or access forbidden." };
    }

    // Fetch all integrity events for this attempt
    const { data: eventsData, error: eventsError } = await supabase
      .from("exam_integrity_events")
      .select("id, attempt_id, student_id, event_type, metadata, client_timestamp, created_at")
      .eq("attempt_id", attemptId)
      .order("created_at", { ascending: true });

    if (eventsError) {
      return { success: false, error: "Failed to load integrity history." };
    }

    const events: IntegrityEventRecord[] = (eventsData ?? []).map((e) => ({
      id: e.id,
      attemptId: e.attempt_id,
      studentId: e.student_id,
      eventType: e.event_type as IntegrityEventRecord["eventType"],
      metadata: (e.metadata ?? {}) as Record<string, unknown>,
      clientTimestamp: e.client_timestamp,
      createdAt: e.created_at,
    }));

    const fullscreenExits = events.filter((e) => e.eventType === "fullscreen_exit").length;
    const focusLossCount = events.filter((e) => e.eventType === "window_blur").length;
    const visibilityChanges = events.filter((e) => e.eventType === "visibility_hidden").length;
    const warningCount = fullscreenExits + focusLossCount + visibilityChanges;

    // Review is suggested if threshold exceeded (default: >= 5 events)
    const reviewSuggested = warningCount >= 5;

    return {
      success: true,
      summary: {
        attemptId,
        totalEvents: events.length,
        fullscreenExits,
        focusLossCount,
        visibilityChanges,
        warningCount,
        reviewSuggested,
        events,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[integrity] getAttemptIntegritySummaryAction error:", msg);
    return { success: false, error: "Failed to retrieve integrity report." };
  }
}

