import "server-only";

/**
 * Shared rate limiter for sensitive endpoints (login, signup, ...).
 *
 * Durable across serverless instances when a Vercel KV / Upstash Redis REST
 * store is configured (`KV_REST_API_URL` + `KV_REST_API_TOKEN`); otherwise it
 * falls back to a per-instance in-memory counter. The in-memory mode is fine
 * for local dev and single-instance runs, but on Vercel it resets on every
 * cold start and is NOT shared between instances — so provisioning KV is what
 * makes brute-force protection actually hold at scale.
 */

type Attempt = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var budgetTrackerRateLimits: Map<string, Attempt> | undefined;
}

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KV_ENABLED = Boolean(KV_URL && KV_TOKEN);

const memory = () => (globalThis.budgetTrackerRateLimits ??= new Map<string, Attempt>());

async function kv(path: string): Promise<{ result: unknown } | null> {
  try {
    const res = await fetch(`${KV_URL}${path}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    return (await res.json()) as { result: unknown };
  } catch {
    return null;
  }
}

export type RateLimitResult = { limited: boolean; backend: "kv" | "memory" };

/**
 * Record one hit against `key` and report whether it now exceeds `max` within
 * a rolling `windowSeconds`. Counts every call; pair with {@link resetRateLimit}
 * on success so legitimate users aren't penalised for a later failure streak.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  if (KV_ENABLED) {
    const incr = await kv(`/incr/${encodeURIComponent(key)}`);
    const count = typeof incr?.result === "number" ? incr.result : null;
    if (count !== null) {
      if (count === 1) await kv(`/expire/${encodeURIComponent(key)}/${windowSeconds}`);
      return { limited: count > max, backend: "kv" };
    }
    // KV unreachable — degrade gracefully to the in-memory counter below.
  }

  const now = Date.now();
  const store = memory();
  const current = store.get(key);
  if (current && current.resetAt > now) {
    current.count += 1;
    return { limited: current.count > max, backend: "memory" };
  }
  store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
  return { limited: false, backend: "memory" };
}

/** Clear the counter for `key` (e.g. after a successful login). */
export async function resetRateLimit(key: string): Promise<void> {
  if (KV_ENABLED) await kv(`/del/${encodeURIComponent(key)}`);
  memory().delete(key);
}

/** Best-effort client IP from proxy headers; "local" when absent. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")?.trim()
    ?? "local";
}
