import { createLogger } from "./logger";

const log = createLogger({ module: "retry" });

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  /** Return true untuk retry, false untuk langsung throw */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Exponential backoff with jitter.
 * Retries network/transient errors, throws immediately for permanent errors.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10_000,
    shouldRetry = defaultShouldRetry,
  } = opts;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxAttempts || !shouldRetry(err, attempt)) {
        throw err;
      }

      const baseDelay = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      );
      // Jitter: random 0-50% of baseDelay
      const jitter = Math.random() * 0.5 * baseDelay;
      const delay = Math.floor(baseDelay + jitter);

      log.warn(
        { attempt, maxAttempts, delay, error: String(err).slice(0, 200) },
        "Retry after error"
      );

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

function defaultShouldRetry(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  // Permanent errors — jangan retry
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) {
    return false;
  }
  if (msg.includes("schema changed")) return false;
  // Network/timeout/5xx — retry
  return true;
}
