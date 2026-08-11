import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { getSession } from "@/lib/auth";
import { allProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (session) redirect("/");
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "signin";
  const authError = typeof params.authError === "string" ? params.authError : undefined;
  return (
    <LoginScreen
      demoMode={process.env.NODE_ENV !== "production"}
      providers={allProviders()}
      authError={authError}
      initialMode={mode}
    />
  );
}
