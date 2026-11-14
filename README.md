# BudgetTracker

A personal finance web app for tracking spending, bills and savings goals, with peso-first, multi-currency support.

**Live app:** https://budgettracker-five-zeta.vercel.app

## Features

- **Accounts and auth:** email/password sign-up (bcrypt hashing, JWT sessions via `jose`) plus Google and Facebook OAuth sign-in, with rate-limited auth endpoints.
- **Transactions and categories:** log income and expenses, categorise them, and filter by period.
- **Dashboard and analytics:** spending breakdowns and trends charted with Recharts.
- **Bills and reminders:** recurring bills, plus a daily Vercel Cron job that emails upcoming-bill reminders through Resend.
- **Savings goals:** track progress toward targets.
- **Multi-currency:** foreign-exchange conversion using live rates.
- **Onboarding and settings:** a guided first run, user preferences and themes.
- **Marketing site:** landing page, Premium waitlist, an SEO blog, sitemap/robots, and privacy and terms pages.
- **Quality:** typed end to end with TypeScript and Zod validation, unit tests with Vitest, CI on GitHub Actions, and error monitoring hooks.

## Tech stack

| Area | Tools |
|---|---|
| Framework | Next.js 16 (App Router, Route Handlers), React 19 |
| Language and validation | TypeScript, Zod |
| Database | PostgreSQL (`pg`), PGlite for local development |
| Auth | bcryptjs, jose (JWT), Google and Facebook OAuth |
| Email and jobs | Resend, Vercel Cron |
| UI | Tailwind CSS 4, Motion, Lucide icons, Recharts |
| Testing and CI | Vitest, GitHub Actions |
| Hosting | Vercel, Vercel Analytics |

## Project structure

```
src/
  app/
    api/        REST route handlers: auth, transactions, categories, bills,
                savings, dashboard, analytics, settings, onboarding, cron, waitlist
    blog/       SEO blog
    login/      Auth screens
    privacy/, terms/
  components/   UI components
  lib/          auth, db, email, fx, oauth, rate-limit, validation (+ tests)
```

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DB, JWT secret, OAuth and Resend keys
npm run dev                  # http://localhost:3000
npm test                     # run unit tests
```

## Author

**David Homillano**, Full-Stack Developer (Java Spring Boot · React/Next.js · Supabase)
[LinkedIn](https://www.linkedin.com/in/david-homillano-818a21349/)
