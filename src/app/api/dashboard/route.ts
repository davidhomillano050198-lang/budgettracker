import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberId = new URL(request.url).searchParams.get("memberId") || undefined;
  return NextResponse.json(await getDashboardData(memberId));
}
