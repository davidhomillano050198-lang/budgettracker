import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/db";
import { isOmniRouteConfigured } from "@/lib/omniroute";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberId = new URL(request.url).searchParams.get("memberId") || undefined;
  const data = await getDashboardData(session.householdId, memberId);
  return NextResponse.json({ ...data, aiSuggestions: isOmniRouteConfigured() });
}
