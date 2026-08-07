import { NextResponse } from "next/server";
import { createAuthCookies, getSession } from "@/lib/auth";
import { getSecurityInfo, updateCredential } from "@/lib/db";
import { securitySchema } from "@/lib/validation";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getSecurityInfo(session.householdId));
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Account-takeover guard: cap credential-change attempts per household
  // (5 / 10 min), so a hijacked session can't brute-force the current password.
  const rlKey = `security:${session.householdId}`;
  if ((await rateLimit(rlKey, 5, 10 * 60)).limited) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }
  const parsed = securitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const result = await updateCredential(session.householdId, parsed.data);
  if (result === "wrong_password") {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }
  await resetRateLimit(rlKey);
  // Keep the session in sync when the login email changes.
  if (parsed.data.newEmail) {
    await createAuthCookies({ householdId: session.householdId, email: parsed.data.newEmail });
  }
  return NextResponse.json({ ok: true });
}
