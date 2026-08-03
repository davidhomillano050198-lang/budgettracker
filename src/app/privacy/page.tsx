import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | BudgetTracker",
  description: "How BudgetTracker collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <p className="eyebrow">BudgetTracker</p>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: August 3, 2026</p>

      <h2>What we collect</h2>
      <p>
        BudgetTracker stores only what you give it: your login email, a securely hashed
        password (never the password itself), household and member names you choose, and the
        financial records you enter — transactions, bills, budgets, savings, and categories.
        If you sign in with Google or Facebook, we receive only your email address and basic
        profile name from that provider; we never see your social-account password.
      </p>

      <h2>How your data is used</h2>
      <p>
        Your data is used for one purpose: showing your household its own finances. We do not
        sell, rent, share, or use your data for advertising — ever. Bill-reminder emails are
        sent only to the address your household configures.
      </p>

      <h2>Who can see your data</h2>
      <p>
        Only people signed into your household: whoever holds your household credential or an
        email you have explicitly whitelisted under Settings → Sign-in &amp; security. Every
        household&apos;s data is isolated — no other user of BudgetTracker can read or modify yours.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only strictly necessary cookies: encrypted session tokens that keep you signed
        in, and small preference cookies (theme, balance privacy). No tracking or advertising
        cookies.
      </p>

      <h2>Third-party services</h2>
      <p>
        The app runs on Vercel (hosting) and Neon (database), both encrypted in transit and at
        rest. Live currency rates are fetched from a public exchange-rate service without
        sending any of your personal data.
      </p>

      <h2>Your rights</h2>
      <p>
        You can export your transactions as CSV at any time, correct any record, and delete
        your entire household — including every transaction, bill, and setting — permanently
        from Settings. Deletion is immediate and irreversible.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests: <a href="mailto:david@radiidevhyperstack.com">david@radiidevhyperstack.com</a>
      </p>

      <p className="legal-back"><Link href="/">← Back to BudgetTracker</Link></p>
    </main>
  );
}
