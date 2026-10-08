import { NextResponse } from "next/server";
import { joinPremiumWaitlist } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { waitlistSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if ((await rateLimit(`waitlist:${clientIp(request)}`, 10, 60 * 60)).limited) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  const parsed = waitlistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid email address" }, { status: 400 });
  }
  const status = await joinPremiumWaitlist(parsed.data.email, parsed.data.source);
  return NextResponse.json({ status }, { status: status === "added" ? 201 : 200 });
}
