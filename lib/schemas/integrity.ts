/**
 * Examination Integrity & Event Logging Domain Schemas
 *
 * Strict Zod validation contracts for browser-event telemetry, candidate consent,
 * and transparent warning thresholds.
 *
 * NOTE ON BROWSER MONITORING LIMITATIONS:
 * A normal web browser cannot guarantee a locked examination device.
 * Fullscreen can fail or be exited, and switching applications or OS notifications
 * can trigger focus change events. Treat these events strictly as integrity signals,
 * never as conclusive automated proof of cheating.
 *
 * @module lib/schemas/integrity
 */
import { z } from "zod";

export const IntegrityEventTypeSchema = z.enum([
  "fullscreen_entry",
  "fullscreen_exit",
  "visibility_hidden",
  "visibility_visible",
  "window_blur",
  "window_focus",
  "reconnect",
  "submission",
  "heartbeat",
]);
export type IntegrityEventType = z.infer<typeof IntegrityEventTypeSchema>;

export const LogIntegrityEventInputSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID"),
  eventType: IntegrityEventTypeSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  clientTimestamp: z.string().datetime({ message: "Must be a valid ISO datetime string" }),
});
export type LogIntegrityEventInput = z.infer<typeof LogIntegrityEventInputSchema>;

export const IntegritySettingsSchema = z.object({
  requireFullscreen: z.boolean().default(false),
  trackFocus: z.boolean().default(true),
  trackVisibility: z.boolean().default(true),
  maxWarningsBeforeFlag: z.number().int().min(1).max(20).default(5),
});
export type IntegritySettings = z.infer<typeof IntegritySettingsSchema>;

export const IntegrityEventRecordSchema = z.object({
  id: z.string(),
  attemptId: z.string(),
  studentId: z.string(),
  eventType: IntegrityEventTypeSchema,
  metadata: z.record(z.string(), z.unknown()),
  clientTimestamp: z.string(),
  createdAt: z.string(),
});
export type IntegrityEventRecord = z.infer<typeof IntegrityEventRecordSchema>;

export const IntegritySummarySchema = z.object({
  attemptId: z.string(),
  totalEvents: z.number().int(),
  fullscreenExits: z.number().int(),
  focusLossCount: z.number().int(),
  visibilityChanges: z.number().int(),
  warningCount: z.number().int(),
  reviewSuggested: z.boolean(),
  events: z.array(IntegrityEventRecordSchema),
});
export type IntegritySummary = z.infer<typeof IntegritySummarySchema>;

export const PreExamAcknowledgementSchema = z.object({
  attemptId: z.string().uuid(),
  acknowledgedRules: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge the examination rules to proceed",
  }),
  consentedToIntegrityMonitoring: z.boolean().refine((val) => val === true, {
    message: "You must consent to integrity monitoring to sit this examination",
  }),
});
export type PreExamAcknowledgement = z.infer<typeof PreExamAcknowledgementSchema>;

