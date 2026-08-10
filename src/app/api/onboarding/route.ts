import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { completeOnboarding } from "@/lib/db";
import { onboardingSchema } from "@/lib/validation";
import { countryByCode } from "@/lib/currencies";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your setup details." }, { status: 400 });
  }
  const currency = countryByCode(parsed.data.country)?.currency ?? "PHP";
  await completeOnboarding(session.householdId, { ...parsed.data, currency });
  return NextResponse.json({ ok: true });
}
