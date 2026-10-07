import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isOmniRouteConfigured, OmniRouteError, suggestCategory } from "@/lib/omniroute";
import { rateLimit } from "@/lib/rate-limit";

const suggestSchema = z.object({
  type: z.enum(["expense", "income"]),
  note: z.string().trim().min(2).max(280),
  categories: z.array(z.object({ id: z.string().min(1).max(80), name: z.string().trim().min(1).max(60) })).min(1).max(60),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOmniRouteConfigured()) return NextResponse.json({ error: "AI suggestions are not configured." }, { status: 503 });
  if ((await rateLimit(`ai-suggest:${session.householdId}`, 30, 60)).limited) {
    return NextResponse.json({ error: "Too many suggestions. Try again in a minute." }, { status: 429 });
  }
  const parsed = suggestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  try {
    const categoryId = await suggestCategory(parsed.data.note, parsed.data.type, parsed.data.categories);
    return NextResponse.json({ categoryId });
  } catch (error) {
    if (error instanceof OmniRouteError) {
      console.error(`[omniroute] ${error.message}`);
      return NextResponse.json({ error: "AI suggestion is unavailable right now." }, { status: 502 });
    }
    throw error;
  }
}
