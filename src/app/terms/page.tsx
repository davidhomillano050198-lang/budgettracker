import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | BudgetTracker",
  description: "The terms that govern your use of BudgetTracker.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <p className="eyebrow">BudgetTracker</p>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: August 3, 2026</p>

      <h2>The service</h2>
      <p>
        BudgetTracker is a household budgeting tool: you record income, spending, bills, and
        savings, and the app organizes and visualizes them. It is provided free of charge,
        as-is, while the service operates.
      </p>

      <h2>Your account</h2>
      <p>
        A household account is shared by the people you invite to it. You are responsible for
        keeping your password safe and for who you whitelist into your household. You must be
        at least 18, and you may only enter data you have the right to share with your
        household members.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t attempt to access other households&apos; data, probe or overload the service, or use
        it for anything unlawful. We may suspend accounts that do.
      </p>

      <h2>Not financial advice</h2>
      <p>
        BudgetTracker displays the numbers you enter, including live currency conversions from
        public market rates. Nothing in the app is financial, investment, or tax advice.
        Displayed conversions are informational and may differ from rates offered by banks.
      </p>

      <h2>Your data, your exit</h2>
      <p>
        Your records belong to you. You can export them as CSV anytime and permanently delete
        your household from Settings. See the <Link href="/privacy">Privacy Policy</Link> for
        details on how data is handled.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided without warranties of any kind. To the maximum extent permitted
        by law, we are not liable for losses arising from use of the app, including decisions
        made based on the numbers it displays or temporary unavailability of the service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the service evolves; material changes will be noted on
        this page. Continued use after changes means acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:david@radiidevhyperstack.com">david@radiidevhyperstack.com</a>
      </p>

      <p className="legal-back"><Link href="/">← Back to BudgetTracker</Link></p>
    </main>
  );
}
