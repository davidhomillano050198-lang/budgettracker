import { NextResponse } from "next/server";
import { createAuthCookies, getSession } from "@/lib/auth";
import { getSecurityInfo, updateCredential } from "@/lib/db";
import { securitySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getSecurityInfo(session.householdId));
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = securitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const result = await updateCredential(session.householdId, parsed.data);
  if (result === "wrong_password") {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }
  // Keep the session in sync when the login email changes.
  if (parsed.data.newEmail) {
    await createAuthCookies({ householdId: session.householdId, email: parsed.data.newEmail });
  }
  return NextResponse.json({ ok: true });
}
