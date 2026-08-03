import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { reverseSavingsEntry } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await reverseSavingsEntry(session.householdId, id);
  if (result === "not_found") {
    return NextResponse.json({ error: "Savings entry not found or already reversed." }, { status: 404 });
  }
  if (result === "would_be_negative") {
    return NextResponse.json(
      { error: "This entry cannot be undone because later withdrawals depend on it." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
