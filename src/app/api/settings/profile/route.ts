import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateProfile } from "@/lib/db";
import { profileSchema } from "@/lib/validation";

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile" }, { status: 400 });
  }
  await updateProfile(session.householdId, parsed.data.householdName, parsed.data.members);
  return NextResponse.json({ ok: true });
}
