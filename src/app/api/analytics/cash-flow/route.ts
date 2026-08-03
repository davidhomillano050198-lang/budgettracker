import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCashFlowData } from "@/lib/db";
import type { CashFlowRange } from "@/lib/types";

const ranges = new Set<CashFlowRange>(["1d", "7d", "4w", "12m", "3y"]);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const requested = params.get("range") as CashFlowRange | null;
  const range = requested && ranges.has(requested) ? requested : "12m";
  const memberId = params.get("memberId") || undefined;
  const anchorRaw = params.get("anchor");
  // Anchor a range to a specific calendar date (YYYY-MM-DD); absent = today.
  const anchor = anchorRaw && /^\d{4}-\d{2}-\d{2}$/.test(anchorRaw) && !Number.isNaN(Date.parse(anchorRaw))
    ? anchorRaw
    : undefined;
  return NextResponse.json(await getCashFlowData(session.householdId, range, memberId, anchor));
}
