/**
 * Minimal, dependency-free Sentry error forwarder.
 *
 * A full SDK (@sentry/nextjs) is overkill for our needs and adds build weight,
 * so we post a single "event" envelope to Sentry's ingest endpoint directly.
 * Completely inert unless `SENTRY_DSN` is set — until then errors still land in
 * the platform logs via instrumentation's console.error. Never throws (telemetry
 * must not break the request path).
 */

type ParsedDsn = { protocol: string; publicKey: string; host: string; projectId: string };

function parseDsn(dsn: string): ParsedDsn | null {
  // https://<publicKey>@<host>/<projectId>
  const m = dsn.match(/^(https?):\/\/([^@]+)@([^/]+)\/(.+)$/);
  if (!m) return null;
  return { protocol: m[1], publicKey: m[2], host: m[3], projectId: m[4] };
}

export async function captureServerError(error: unknown, extra?: Record<string, unknown>): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const p = parseDsn(dsn);
  if (!p) return;

  try {
    const eventId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, "");
    const sentAt = new Date().toISOString();
    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "node",
      level: "error",
      logger: "instrumentation.onRequestError",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production",
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      server_name: undefined,
      exception: {
        values: [{
          type: error instanceof Error ? error.name : "Error",
          value: error instanceof Error ? error.message : String(error),
          stacktrace: error instanceof Error && error.stack
            ? { frames: error.stack.split("\n").slice(1, 40).map((line) => ({ function: line.trim() })) }
            : undefined,
        }],
      },
      extra,
    };
    const envelope =
      JSON.stringify({ event_id: eventId, sent_at: sentAt, dsn }) + "\n" +
      JSON.stringify({ type: "event" }) + "\n" +
      JSON.stringify(event) + "\n";

    await fetch(`${p.protocol}://${p.host}/api/${p.projectId}/envelope/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${p.publicKey}, sentry_client=budgettracker/1.0`,
      },
      body: envelope,
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Swallow — telemetry failures must never affect the actual request.
  }
}
