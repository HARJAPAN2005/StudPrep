/**
 * Upload Rate Limiter
 *
 * Enforces per-candidate upload throttling to prevent denial of service and
 * storage exhaustion.
 *
 * @module lib/ingestion/rate-limiter
 */
import { INGESTION_CONFIG } from "./config";

interface RateRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateRecord>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Checks whether an authenticated user is within their hourly upload rate limit.
 */
export function checkUploadRateLimit(
  userId: string,
  now = Date.now()
): { allowed: boolean; remaining: number; resetInMs: number } {
  let record = memoryStore.get(userId);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(userId, record);
  }

  // Filter timestamps within current 1-hour window
  record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  const count = record.timestamps.length;
  const max = INGESTION_CONFIG.MAX_UPLOADS_PER_USER_PER_HOUR;

  if (count >= max) {
    const oldest = record.timestamps[0];
    const resetInMs = Math.max(0, WINDOW_MS - (now - oldest));
    return {
      allowed: false,
      remaining: 0,
      resetInMs,
    };
  }

  // Record this upload
  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: max - (count + 1),
    resetInMs: WINDOW_MS,
  };
}

/** Resets rate limits (used in testing) */
export function resetRateLimits(): void {
  memoryStore.clear();
}

