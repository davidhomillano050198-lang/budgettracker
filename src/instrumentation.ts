/**
 * Next.js instrumentation hooks.
 *
 * `register()` runs once when the server process starts — we use it to
 * validate the environment (fail fast on an insecure production config).
 * `onRequestError` is Next's native server-error hook: it captures unhandled
 * errors from Server Components, route handlers, and middleware with request
 * context. Errors are logged as structured JSON (picked up by the platform log
 * drain today) and this is the single place to forward to Sentry once a
 * `SENTRY_DSN` is configured.
 */

export async function register(): Promise<void> {
  const { validateEnv } = await import("@/lib/env");
  validateEnv();
}

type ErrorRequest = { path?: string; method?: string; headers?: Record<string, string> };
type ErrorContext = { routerKind?: string; routePath?: string; routeType?: string };

export async function onRequestError(error: unknown, request: ErrorRequest, context: ErrorContext): Promise<void> {
  const meta = { method: request?.method, path: request?.path, routerKind: context?.routerKind, routePath: context?.routePath };
  console.error("[request-error]", JSON.stringify({
    level: "error",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...meta,
    at: new Date().toISOString(),
  }));
  // Forward to Sentry when SENTRY_DSN is configured (no-op otherwise).
  const { captureServerError } = await import("@/lib/sentry");
  await captureServerError(error, meta);
}
