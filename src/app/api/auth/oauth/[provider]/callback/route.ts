import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuthCookies } from "@/lib/auth";
import { createHousehold, resolveOAuthSession } from "@/lib/db";
import { exchangeCodeForEmail, isOAuthProvider, requestOrigin } from "@/lib/oauth";

const STATE_COOKIE = "bt_oauth_state";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const origin = requestOrigin(request);
  const fail = (reason: string) => NextResponse.redirect(`${origin}/?authError=${reason}`);

  if (!isOAuthProvider(provider)) return fail("unknown-provider");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);
  if (!code || !state || expectedState !== `${provider}:${state}`) return fail("state-mismatch");

  const email = await exchangeCodeForEmail(provider, origin, code).catch(() => null);
  if (!email) return fail("exchange-failed");

  // Known email (household login or whitelisted partner) → sign into that
  // household. Unknown email → welcome aboard: provision a fresh household.
  const session = await resolveOAuthSession(email);
  if (session) {
    await createAuthCookies(session);
    return NextResponse.redirect(`${origin}/`);
  }

  const householdId = await createHousehold({ email, passwordHash: null });
  await createAuthCookies({ householdId, email });
  return NextResponse.redirect(`${origin}/?welcome=1`);
}
