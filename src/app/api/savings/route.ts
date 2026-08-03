import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSavingsEntry, updateSavingsGoal } from "@/lib/db";
import { savingsEntrySchema, savingsGoalSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = savingsEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid savings entry" }, { status: 400 });
  }

  const result = await createSavingsEntry(parsed.data);
  if (result === "no_change") {
    return NextResponse.json({ error: "The corrected balance is already the current savings total." }, { status: 409 });
  }
  if (result === "insufficient") {
    return NextResponse.json({ error: "This withdrawal is higher than the recorded savings balance." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, ...result }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = savingsGoalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid savings goal" }, { status: 400 });
  }
  await updateSavingsGoal(parsed.data.savingsGoal);
  return NextResponse.json({ ok: true });
}
