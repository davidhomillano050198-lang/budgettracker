import { NextResponse } from "next/server";
import { buildAuthorizeUrl, isOAuthProvider, requestOrigin } from "@/lib/oauth";

const STATE_COOKIE = "bt_oauth_state";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const origin = requestOrigin(request);
  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(`${origin}/?authError=unknown-provider`);
  }
  const state = crypto.randomUUID();
  const authorizeUrl = buildAuthorizeUrl(provider, origin, state);
  if (!authorizeUrl) {
    return NextResponse.redirect(`${origin}/?authError=provider-not-configured`);
  }
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, `${provider}:${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
