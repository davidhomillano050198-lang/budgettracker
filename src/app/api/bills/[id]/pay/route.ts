import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { payBill } from "@/lib/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const paid = await payBill(session.householdId, id);
    return NextResponse.json({ paid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to pay bill";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
