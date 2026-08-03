import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createBill } from "@/lib/db";
import { billSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = billSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid bill" }, { status: 400 });
  }
  const id = await createBill(session.householdId, parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}
