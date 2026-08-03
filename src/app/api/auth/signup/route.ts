import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { createAuthCookies } from "@/lib/auth";
import { createHousehold, findHouseholdForEmail } from "@/lib/db";
import { signupSchema } from "@/lib/validation";

type Attempt = { count: number; resetAt: number };

declare global {
  var budgetTrackerSignupAttempts: Map<string, Attempt> | undefined;
}

const attempts = globalThis.budgetTrackerSignupAttempts ?? new Map<string, Attempt>();
globalThis.budgetTrackerSignupAttempts = attempts;

export async function POST(request: Request) {
  // Basic abuse guard: at most 3 new households per IP per hour.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const attempt = attempts.get(ip);
  if (attempt && attempt.resetAt > now && attempt.count >= 3) {
    return NextResponse.json({ error: "Too many sign-ups from this connection. Try again later." }, { status: 429 });
  }

  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details and try again." }, { status: 400 });
  }

  if (await findHouseholdForEmail(parsed.data.email)) {
    return NextResponse.json({ error: "That email already belongs to a household. Sign in instead." }, { status: 409 });
  }

  const householdId = await createHousehold({
    email: parsed.data.email,
    passwordHash: await hash(parsed.data.password, 12),
    householdName: parsed.data.householdName,
  });

  const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 60 * 60_000 };
  attempts.set(ip, { ...current, count: current.count + 1 });

  await createAuthCookies({ householdId, email: parsed.data.email });
  return NextResponse.json({ ok: true }, { status: 201 });
}
