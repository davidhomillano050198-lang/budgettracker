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

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "budgettracker-local-development-secret-change-before-production",
);

async function signToken(session: Session, tokenType: "access" | "refresh", expiresIn: number) {
  return new SignJWT({ ...session, tokenType })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.householdId)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret);
}

async function verifyToken(token: string | undefined, tokenType: "access" | "refresh") {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
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
