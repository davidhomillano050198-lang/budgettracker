import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBaseCurrency } from "@/lib/db";
import { getFxQuote } from "@/lib/fx";

export const dynamic = "force-dynamic";

/** Live-rate preview for the Settings country picker (before saving). */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const target = (new URL(request.url).searchParams.get("target") ?? "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(target)) return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  const base = await getBaseCurrency(session.householdId);
  const quote = await getFxQuote(base, target);
  if (!quote) return NextResponse.json({ base, target, available: false });
  return NextResponse.json({ base, target, available: true, rate: quote.rate, updatedAt: quote.updatedAt });
}
