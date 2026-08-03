import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteCategory, updateCategory, type CategoryMutationResult } from "@/lib/db";
import { categoryUpdateSchema } from "@/lib/validation";

function respond(result: CategoryMutationResult) {
  if (result === "not_found") return NextResponse.json({ error: "Category not found" }, { status: 404 });
  if (typeof result === "object") {
    return NextResponse.json(
      { error: `This category is used by ${result.inUse} record${result.inUse === 1 ? "" : "s"}. Reassign those transactions or bills first.` },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = categoryUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid category" }, { status: 400 });
  }
  return respond(await updateCategory(session.householdId, id, parsed.data));
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  return respond(await deleteCategory(session.householdId, id));
}
