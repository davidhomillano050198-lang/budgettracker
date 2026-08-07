import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ACCESS_COOKIE = "bt_access";
const REFRESH_COOKIE = "bt_refresh";
const ACCESS_SECONDS = 60 * 15;
const REFRESH_SECONDS = 60 * 60 * 24 * 30;

export type Session = {
  householdId: string;
  email: string;
};

type SessionClaims = JWTPayload & Session & { tokenType: "access" | "refresh" };

const DEV_JWT_FALLBACK = "budgettracker-local-development-secret-change-before-production";

let cachedSecret: Uint8Array | null = null;

// Resolved lazily (not at module load) so `next build` — which runs with
// NODE_ENV=production — never crashes just from importing this module. The
// guard still fails fast at the first sign/verify at runtime.
function secretKey(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const configured = process.env.JWT_SECRET;
  // In production the session-signing key MUST be a real secret. Falling back
  // to the public dev value would let anyone forge session cookies for any
  // household, so refuse to sign/verify with it.
  if (process.env.NODE_ENV === "production" && (!configured || configured === DEV_JWT_FALLBACK)) {
    throw new Error("JWT_SECRET must be set to a strong secret in production (the dev fallback is public).");
  }
  cachedSecret = new TextEncoder().encode(configured ?? DEV_JWT_FALLBACK);
  return cachedSecret;
}

async function signToken(session: Session, tokenType: "access" | "refresh", expiresIn: number) {
  return new SignJWT({ ...session, tokenType })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.householdId)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secretKey());
}

async function verifyToken(token: string | undefined, tokenType: "access" | "refresh") {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const claims = payload as SessionClaims;
    if (claims.tokenType !== tokenType || !claims.householdId || !claims.email) return null;
    return { householdId: claims.householdId, email: claims.email } satisfies Session;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return (
    (await verifyToken(store.get(ACCESS_COOKIE)?.value, "access")) ??
    (await verifyToken(store.get(REFRESH_COOKIE)?.value, "refresh"))
  );
}

export async function createAuthCookies(session: Session) {
  const store = await cookies();
  const [access, refresh] = await Promise.all([
    signToken(session, "access", ACCESS_SECONDS),
    signToken(session, "refresh", REFRESH_SECONDS),
  ]);
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    priority: "high" as const,
  };
  store.set(ACCESS_COOKIE, access, { ...base, maxAge: ACCESS_SECONDS });
  store.set(REFRESH_COOKIE, refresh, { ...base, maxAge: REFRESH_SECONDS });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
