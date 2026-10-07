/**
 * Boot-time environment validation. Called from instrumentation.register() so
 * a misconfigured production deploy fails fast (or logs loudly) instead of
 * silently running insecurely or against the wrong database.
 */

const DEV_JWT_FALLBACK = "budgettracker-local-development-secret-change-before-production";

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return;
  // `next build` also runs with NODE_ENV=production; only validate at real
  // server start, never during the build phase.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const errors: string[] = [];
  const warnings: string[] = [];

  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt === DEV_JWT_FALLBACK) {
    errors.push("JWT_SECRET is unset or the public dev value — sessions would be forgeable.");
  } else if (jwt.length < 32) {
    warnings.push("JWT_SECRET is shorter than 32 characters; use a longer random secret.");
  }

  if (!process.env.DATABASE_URL) {
    warnings.push("DATABASE_URL is unset — the app will use the ephemeral embedded DB, not a hosted database.");
  }
  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY is unset — bill-reminder emails will not send.");
  }
  if (!process.env.CRON_SECRET) {
    warnings.push("CRON_SECRET is unset — the reminder cron endpoint is unprotected/disabled.");
  }

  for (const w of warnings) console.warn(`[env] WARNING: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`[env] FATAL: ${e}`);
    throw new Error(`Invalid production environment: ${errors.join(" ")}`);
  }
}
