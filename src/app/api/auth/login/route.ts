import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createAuthCookies } from "@/lib/auth";
import { getCredential } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

type Attempt = { count: number; resetAt: number };

declare global {
  var budgetTrackerLoginAttempts: Map<string, Attempt> | undefined;
}

const attempts = globalThis.budgetTrackerLoginAttempts ?? new Map<string, Attempt>();
globalThis.budgetTrackerLoginAttempts = attempts;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const attempt = attempts.get(ip);
  if (attempt && attempt.resetAt > now && attempt.count >= 5) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const credential = await getCredential(parsed.data.email);
  const valid = credential ? await compare(parsed.data.password, credential.password_hash) : false;
  if (!credential || !valid) {
    const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 5 * 60_000 };
    attempts.set(ip, { ...current, count: current.count + 1 });
    return NextResponse.json({ error: "That email or password does not match." }, { status: 401 });
  }

  attempts.delete(ip);
  await createAuthCookies({ householdId: credential.household_id, email: credential.email });
  return NextResponse.json({ ok: true });
}
