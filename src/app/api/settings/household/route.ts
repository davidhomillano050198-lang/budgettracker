import { NextResponse } from "next/server";
import { clearAuthCookies, getSession } from "@/lib/auth";
import { deleteHousehold } from "@/lib/db";

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { currentPassword?: string };
  const result = await deleteHousehold(session.householdId, String(body.currentPassword ?? ""));
  if (result === "wrong_password") {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
