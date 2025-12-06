// lib/ai-tools/utilities/supabase-helpers.ts
/**
 * Supabase helper utilities: transient-error detection, retry with backoff,
 * and error normalization when Cloudflare/PostgREST return HTML error bodies.
 */

export function isTransientError(err: unknown): boolean {
  const msg =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
      ? String((err as any).message || "")
      : "";
  if (!msg) return false;

  const m = msg.toLowerCase();
  return (
    m.includes("internal server error") ||
    m.includes("500") ||
    m.includes("<html") ||
    m.includes("cloudflare") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("econnreset") ||
    m.includes("network error") ||
    m.includes("fetch failed") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504")
  );
}

export function normalizeDbError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
      ? String((err as any).message || "")
      : String(err || "Unknown error");

  // If HTML body got bubbled up, collapse to concise message
  if (raw.includes("<html")) {
    return "Transient upstream error (HTML response). Please retry.";
  }
  return raw;
}

/**
 * Retry an async operation with jittered backoff on transient errors.
 * - retries: number of additional attempts (default 2 -> total up to 3 calls)
 * - baseDelayMs: starting delay before retry
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 300
): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err) || attempt === retries) break;

      // Exponential backoff with jitter
      const delay =
        baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
      await new Promise((res) => setTimeout(res, delay));
      attempt += 1;
    }
  }
  throw lastErr;
}
