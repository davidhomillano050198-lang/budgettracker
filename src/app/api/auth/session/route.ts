import { NextResponse } from "next/server";
import { createAuthCookies, getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  await createAuthCookies(session);
  return NextResponse.json({ authenticated: true, email: session.email });
}
