import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { payBill } from "@/lib/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const paid = await payBill(id);
    return NextResponse.json({ paid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to pay bill";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
