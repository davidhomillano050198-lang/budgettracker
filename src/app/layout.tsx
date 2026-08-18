import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://budgettracker-five-zeta.vercel.app"),
  title: {
    default: "Budget Tracker — budgeting for couples & families",
    template: "%s · Budget Tracker",
  },
  description: "The private budgeting app for couples and families. Track income and spending, plan budgets, split by person, and never miss a bill. Free forever plan — no credit card.",
  keywords: ["budgeting app", "couples budget", "family budget", "household finance", "expense tracker", "bill reminders", "savings tracker"],
  openGraph: {
    title: "Budget Tracker — budgeting for couples & families",
    description: "Track spending, plan budgets, split by person, and never miss a bill — in one private space you and your partner share. Free forever plan.",
    url: "/",
    siteName: "Budget Tracker",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Budget Tracker — budgeting for couples & families" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Budget Tracker — budgeting for couples & families",
    description: "The private budgeting app for couples and families. Free forever plan.",
    images: ["/og.png"],
  },
  verification: {
    google: "ne6KGog_PWIgV35",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand-mark-ink-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1512" },
  ],
};

// Runs before paint: resolves the stored theme preference (or system) so the
// correct palette is applied with no flash. Preference lives in localStorage.
const themeInitScript = `(function(){try{var t=localStorage.getItem("bt-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-PH"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{themeInitScript}</Script>
      </head>
      <body suppressHydrationWarning>{children}<Analytics /></body>
    </html>
  );
}
