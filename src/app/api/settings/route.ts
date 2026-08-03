import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { countryByCode } from "@/lib/currencies";
import { updateSettings } from "@/lib/db";
import { budgetSchema } from "@/lib/validation";

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = budgetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });
  }
  // The currency always derives from the chosen country server-side,
  // so the two can never disagree.
  let country: string | undefined;
  let currency: string | undefined;
  if (parsed.data.country) {
    const option = countryByCode(parsed.data.country);
    if (!option) return NextResponse.json({ error: "Unsupported country." }, { status: 400 });
    country = option.code;
    currency = option.currency;
  }
  await updateSettings(session.householdId, parsed.data.monthlyBudget, parsed.data.reminderEmail, country, currency);
  return NextResponse.json({ ok: true });
}
