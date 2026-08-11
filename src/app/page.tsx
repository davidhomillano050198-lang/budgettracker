import { cookies } from "next/headers";
import { BudgetDashboard } from "@/components/budget-dashboard";
import { LandingPage } from "@/components/landing-page";
import { LoginScreen } from "@/components/login-screen";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/db";
import { allProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) {
    const params = await searchParams;
    const authError = typeof params.authError === "string" ? params.authError : undefined;
    // Auth errors (e.g. failed OAuth) still surface the sign-in screen; everyone
    // else gets the marketing landing page.
    if (authError) {
      return <LoginScreen demoMode={process.env.NODE_ENV !== "production"} providers={allProviders()} authError={authError} />;
    }
    return <LandingPage />;
  }
  const data = await getDashboardData(session.householdId);
  const store = await cookies();
  const initialPrivacy = store.get("bt_privacy")?.value === "1";
  return <BudgetDashboard initialData={data} sessionEmail={session.email} initialPrivacy={initialPrivacy} />;
}
