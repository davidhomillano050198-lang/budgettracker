import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setCategoryAllocation } from "@/lib/db";
import { allocationSchema } from "@/lib/validation";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = allocationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid allocation" }, { status: 400 });
  }
  const result = await setCategoryAllocation(session.householdId, id, parsed.data.amount);
  if (result === "not_found") return NextResponse.json({ error: "Category not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
