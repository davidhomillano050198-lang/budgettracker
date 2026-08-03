import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteTransaction, updateTransaction, type MutationResult } from "@/lib/db";
import { transactionSchema } from "@/lib/validation";

function respond(result: MutationResult) {
  if (result === "not_found") return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (result === "bill_locked") {
    return NextResponse.json(
      { error: "This entry was created by a bill payment. Manage it from Bills & reminders." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transaction" }, { status: 400 });
  }
  return respond(await updateTransaction(id, parsed.data));
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  return respond(await deleteTransaction(id));
}
