import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createAuthCookies } from "@/lib/auth";
import { getCredential } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Brute-force guard: at most 5 attempts per IP per 5 minutes (durable via KV
  // when configured). A successful login clears the counter.
  const key = `login:${clientIp(request)}`;
  if ((await rateLimit(key, 5, 5 * 60)).limited) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const credential = await getCredential(parsed.data.email);
  const valid = credential ? await compare(parsed.data.password, credential.password_hash) : false;
  if (!credential || !valid) {
    return NextResponse.json({ error: "That email or password does not match." }, { status: 401 });
  }

  await resetRateLimit(key);
  await createAuthCookies({ householdId: credential.household_id, email: credential.email });
  return NextResponse.json({ ok: true });
}
