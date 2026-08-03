import "server-only";

/**
 * Minimal server-side OAuth 2.0 authorization-code flow for household sign-in.
 * Providers are active only when their env credentials are configured; the
 * login screen offers exactly the active set. Successful sign-ins still issue
 * the app's own JWT cookies — OAuth only proves ownership of an email that
 * the household has allowed (Settings → Sign-in & security).
 */

export type OAuthProviderId = "google" | "facebook";

type ProviderConfig = {
  id: OAuthProviderId;
  label: string;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  scope: string;
  extraAuthParams?: Record<string, string>;
};

function providerConfig(id: OAuthProviderId): ProviderConfig | null {
  if (id === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      id, label: "Google", clientId, clientSecret,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      scope: "openid email profile",
      extraAuthParams: { access_type: "online", prompt: "select_account" },
    };
  }
  const clientId = process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.FACEBOOK_APP_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    id, label: "Facebook", clientId, clientSecret,
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    scope: "email public_profile",
  };
}

export function activeProviders(): Array<{ id: OAuthProviderId; label: string }> {
  return (["google", "facebook"] as const)
    .map((id) => providerConfig(id))
    .filter((config): config is ProviderConfig => config !== null)
    .map(({ id, label }) => ({ id, label }));
}

/** All supported providers, with whether their credentials are configured. */
export function allProviders(): Array<{ id: OAuthProviderId; label: string; configured: boolean }> {
  // Google-only sign-in. (Facebook flow remains implemented in oauth.ts but is
  // intentionally not offered on the login screen.)
  return [
    { id: "google", label: "Google", configured: providerConfig("google") !== null },
  ];
}

export function isOAuthProvider(value: string): value is OAuthProviderId {
  return value === "google" || value === "facebook";
}

const redirectUri = (origin: string, id: OAuthProviderId) => `${origin}/api/auth/oauth/${id}/callback`;

export function buildAuthorizeUrl(id: OAuthProviderId, origin: string, state: string): string | null {
  const config = providerConfig(id);
  if (!config) return null;
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri(origin, id));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  for (const [key, value] of Object.entries(config.extraAuthParams ?? {})) url.searchParams.set(key, value);
  return url.toString();
}

/** Exchange the authorization code and return the account's verified email. */
export async function exchangeCodeForEmail(id: OAuthProviderId, origin: string, code: string): Promise<string | null> {
  const config = providerConfig(id);
  if (!config) return null;

  if (id === "google") {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri(origin, id),
        grant_type: "authorization_code",
      }),
    });
    if (!response.ok) return null;
    const tokens = (await response.json()) as { id_token?: string };
    if (!tokens.id_token) return null;
    // The id_token arrives directly from Google's token endpoint over TLS,
    // so decoding its payload without re-verifying the signature is safe here.
    const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString()) as {
      email?: string; email_verified?: boolean;
    };
    if (!payload.email || payload.email_verified === false) return null;
    return payload.email.toLowerCase();
  }

  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", config.clientId);
  tokenUrl.searchParams.set("client_secret", config.clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri(origin, id));
  tokenUrl.searchParams.set("code", code);
  const tokenResponse = await fetch(tokenUrl);
  if (!tokenResponse.ok) return null;
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) return null;
  const profileResponse = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=email&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!profileResponse.ok) return null;
  const profile = (await profileResponse.json()) as { email?: string };
  return profile.email?.toLowerCase() ?? null;
}

/** Derive the public origin, honoring reverse-proxy headers (Vercel). */
export function requestOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
