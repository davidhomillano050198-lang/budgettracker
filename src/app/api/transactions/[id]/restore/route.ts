import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { restoreTransaction, type MutationResult } from "@/lib/db";

function respond(result: MutationResult) {
  if (result === "not_found") return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (result === "bill_locked") {
    return NextResponse.json(
      { error: "Bill payment transactions are managed from Bills & reminders." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  return respond(await restoreTransaction(session.householdId, id));
}
