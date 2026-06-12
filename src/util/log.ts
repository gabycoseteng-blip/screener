/** Minimal structured logger. Stdout is captured by Vercel function logs. */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = { t: new Date().toISOString(), level, msg, ...meta };
  const out = level === "error" || level === "warn" ? console.error : console.log;
  out(JSON.stringify(line));
}

export const log = {
  debug: (m: string, meta?: Record<string, unknown>) => emit("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit("error", m, meta),
};

/** Retry a transient async op with exponential backoff (2s, 4s, 8s, 16s). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseMs?: number; label?: string } = {},
): Promise<T> {
  const { attempts = 4, baseMs = 2000, label = "op" } = opts;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1) break;
      const wait = baseMs * 2 ** i;
      log.warn(`retrying ${label}`, { attempt: i + 1, waitMs: wait, error: String(err) });
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
