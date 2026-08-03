import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createTransaction, listTransactions, type TransactionFilters } from "@/lib/db";
import { transactionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const typeParam = params.get("type");
  const filters: TransactionFilters = {
    search: params.get("search")?.trim() || undefined,
    type: typeParam === "expense" || typeParam === "income" ? typeParam : undefined,
    categoryId: params.get("categoryId") || undefined,
    memberId: params.get("memberId") || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
  };
  return NextResponse.json(await listTransactions(filters));
}

export async function POST(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transaction" }, { status: 400 });
  }
  const id = await createTransaction(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}
