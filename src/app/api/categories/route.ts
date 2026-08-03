import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCategory } from "@/lib/db";
import { categorySchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid category" }, { status: 400 });
  }
  const id = await createCategory(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}
