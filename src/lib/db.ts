import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { compare, hash } from "bcryptjs";
import { addDays, format } from "date-fns";
import { getFxQuote } from "@/lib/fx";
import type { PGlite } from "@electric-sql/pglite";
import type { BillItem, CashFlowData, CashFlowRange, Category, DashboardData, MemberBudgetRole, MemberRelationship, PaymentMethod, SavingsActivity, SavingsEntryKind, TransactionItem } from "@/lib/types";

const MEMBER_COLORS = [
  "#1D2924",
  "#D77A58",
  "#5B83A6",
  "#8B78A8",
  "#D6A84B",
  "#4D9A8B",
  "#D25D64",
  "#7C837F",
];

const LEGACY_DEV_HOUSEHOLD_ID = "household-main";

/**
 * Minimal database contract shared by both backends:
 *  - PGlite (embedded, local `.data` folder) when DATABASE_URL is not set
 *  - node-postgres against a hosted Postgres (Neon/Supabase/etc.) when it is
 * Both expose the same query/exec/transaction surface, so the rest of this
 * file is backend-agnostic.
 */
export interface DbClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
}

declare global {
  var budgetTrackerDbPromise: Promise<DbClient> | undefined;
}

const schema = `
  CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_set BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS member_profiles (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    color TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'other' CHECK (relationship IN ('self', 'spouse', 'partner', 'child', 'parent', 'sibling', 'relative', 'friend', 'roommate', 'other')),
    budget_role TEXT NOT NULL DEFAULT 'contributor' CHECK (budget_role IN ('owner', 'planner', 'contributor', 'dependent', 'observer')),
    email TEXT,
    monthly_contribution NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income'))
  );
  CREATE TABLE IF NOT EXISTS household_settings (
    household_id TEXT PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
    monthly_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'PHP',
    reminder_email TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
    allowed_signin_emails TEXT[] NOT NULL DEFAULT '{}',
    country TEXT NOT NULL DEFAULT 'PH'
  );
  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    category_id TEXT NOT NULL REFERENCES categories(id),
    member_id TEXT NOT NULL REFERENCES member_profiles(id),
    due_date DATE NOT NULL,
    recurrence TEXT NOT NULL CHECK (recurrence IN ('once', 'monthly', 'quarterly', 'yearly')),
    reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[7,3,1],
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'paid', 'overdue')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    category_id TEXT NOT NULL REFERENCES categories(id),
    member_id TEXT NOT NULL REFERENCES member_profiles(id),
    note TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'bank', 'ewallet')),
    occurred_at TIMESTAMPTZ NOT NULL,
    bill_id TEXT UNIQUE REFERENCES bills(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS reminder_logs (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    reminder_day INTEGER NOT NULL,
    sent_to TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bill_id, reminder_day)
  );
  CREATE TABLE IF NOT EXISTS savings_entries (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('deposit', 'withdrawal', 'correction')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount <> 0),
    note TEXT NOT NULL,
    reversed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS transactions_household_date_idx ON transactions(household_id, occurred_at DESC);
  CREATE INDEX IF NOT EXISTS bills_household_due_idx ON bills(household_id, due_date);
  CREATE INDEX IF NOT EXISTS savings_entries_household_date_idx ON savings_entries(household_id, created_at DESC);
`;

function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

type TransactionRow = {
  id: string; type: "expense" | "income"; amount: string; note: string; payment_method: PaymentMethod;
  occurred_at: Date; bill_id: string | null;
  category_id: string; category_name: string; category_color: string; category_icon: string; category_kind: "expense" | "income";
  member_id: string; member_name: string; initials: string; member_color: string;
};

const TRANSACTION_SELECT = `SELECT t.id, t.type, t.amount, t.note, t.payment_method, t.occurred_at, t.bill_id,
       c.id AS category_id, c.name AS category_name, c.color AS category_color, c.icon AS category_icon, c.kind AS category_kind,
       m.id AS member_id, m.name AS member_name, m.initials, m.color AS member_color
     FROM transactions t JOIN categories c ON c.id = t.category_id JOIN member_profiles m ON m.id = t.member_id`;

function mapTransactionRow(row: TransactionRow): TransactionItem {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    note: row.note,
    paymentMethod: row.payment_method,
    occurredAt: asIso(row.occurred_at),
    billId: row.bill_id,
    category: { id: row.category_id, name: row.category_name, color: row.category_color, icon: row.category_icon, kind: row.category_kind },
    member: { id: row.member_id, name: row.member_name, initials: row.initials, color: row.member_color },
  };
}

function monthDate(monthOffset: number, day: number, hour = 10) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, Math.min(day, 25), hour).toISOString();
}

/**
 * Demo transactions/bills are seeded only when explicitly requested via
 * SEED_DEMO_DATA=true, or by default in local development. Production
 * databases start clean: household, login, members, and categories only.
 */
function demoSeedEnabled() {
  const flag = process.env.SEED_DEMO_DATA;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

async function seedDatabase(db: DbClient) {
  const household = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM households");
  if (Number(household.rows[0]?.count) > 0) return;

  const email = (process.env.HOUSEHOLD_EMAIL ?? "hello@budgettracker.local").toLowerCase();
  const passwordHash = await hash(process.env.HOUSEHOLD_PASSWORD ?? "Together2026!", 12);
  const includeDemoData = demoSeedEnabled();
  console.info(`[db] Seeding fresh database (demo data: ${includeDemoData ? "on" : "off"})`);

  await db.transaction(async (tx) => {
    await tx.query("INSERT INTO households (id, name) VALUES ($1, $2)", [LEGACY_DEV_HOUSEHOLD_ID, "Our Household"]);
    await tx.query(
      "INSERT INTO credentials (id, household_id, email, password_hash) VALUES ($1, $2, $3, $4)",
      ["credential-main", LEGACY_DEV_HOUSEHOLD_ID, email, passwordHash],
    );
    await tx.query(
      "INSERT INTO household_settings (household_id, monthly_budget, reminder_email) VALUES ($1, $2, $3)",
      [LEGACY_DEV_HOUSEHOLD_ID, 65000, email],
    );

    const members = [
      ["member-you", "You", "YO", "#1D2924", "self", "owner"],
      ["member-partner", "Partner", "PA", "#D77A58", "partner", "contributor"],
    ];
    for (const member of members) {
      await tx.query(
        "INSERT INTO member_profiles (id, household_id, name, initials, color, relationship, budget_role) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [member[0], LEGACY_DEV_HOUSEHOLD_ID, member[1], member[2], member[3], member[4], member[5]],
      );
    }

    const categories = [
      ["food", "Food & Dining", "#D77A58", "utensils", "expense"],
      ["transport", "Transport", "#5B83A6", "car", "expense"],
      ["shopping", "Shopping", "#D6A84B", "shopping-bag", "expense"],
      ["home", "Home", "#8B78A8", "house", "expense"],
      ["health", "Health", "#D25D64", "heart-pulse", "expense"],
      ["leisure", "Leisure", "#4D9A8B", "sparkles", "expense"],
      ["other", "Others", "#7C837F", "ellipsis", "expense"],
      ["salary", "Salary", "#16A368", "briefcase-business", "income"],
      ["extra-income", "Other Income", "#3C8F76", "circle-plus", "income"],
    ];
    for (const category of categories) {
      await tx.query(
        "INSERT INTO categories (id, household_id, name, color, icon, kind) VALUES ($1, $2, $3, $4, $5, $6)",
        [category[0], LEGACY_DEV_HOUSEHOLD_ID, category[1], category[2], category[3], category[4]],
      );
    }

    if (!includeDemoData) return;

    const baseline = [
      ["income", 85000, "salary", "member-you", "Monthly household income", 2],
      ["expense", 8200, "food", "member-partner", "Groceries and market", 4],
      ["expense", 3400, "transport", "member-you", "Fuel and commute", 7],
      ["expense", 2150, "shopping", "member-partner", "Household essentials", 10],
      ["expense", 1890, "leisure", "member-you", "Weekend coffee and movies", 12],
      ["expense", 1480, "health", "member-partner", "Pharmacy", 14],
    ] as const;

    for (let offset = -5; offset <= 0; offset += 1) {
      for (const [type, amount, category, member, note, day] of baseline) {
        const variation = type === "income" ? offset * -500 : Math.abs(offset) * 130;
        await tx.query(
          "INSERT INTO transactions (id, household_id, type, amount, category_id, member_id, note, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [crypto.randomUUID(), LEGACY_DEV_HOUSEHOLD_ID, type, amount + variation, category, member, note, monthDate(offset, day)],
        );
      }
    }

    const bills = [
      ["Electricity", 3450, "home", 3, "monthly", "Meralco monthly statement"],
      ["Home internet", 1699, "home", 7, "monthly", "Fiber plan"],
      ["Condo dues", 2800, "home", 12, "monthly", "Association dues"],
    ] as const;
    for (const [name, amount, category, days, recurrence, note] of bills) {
      await tx.query(
        "INSERT INTO bills (id, household_id, name, amount, category_id, member_id, due_date, recurrence, reminder_days, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          crypto.randomUUID(),
          LEGACY_DEV_HOUSEHOLD_ID,
          name,
          amount,
          category,
          "member-you",
          format(addDays(new Date(), days), "yyyy-MM-dd"),
          recurrence,
          [7, 3, 1, 0],
          note,
        ],
      );
    }
  });
}

/** Wrap the embedded PGlite engine (local dev / fallback) in the DbClient contract. */
function pgliteClient(db: PGlite): DbClient {
  return {
    async query(sql, params) {
      const result = await db.query(sql, params as unknown[]);
      return { rows: result.rows as never[] };
    },
    async exec(sql) { await db.exec(sql); },
    async transaction(fn) {
      return db.transaction(async (tx) => {
        const txClient: DbClient = {
          async query(sql, params) {
            const result = await tx.query(sql, params as unknown[]);
            return { rows: result.rows as never[] };
          },
          async exec(sql) { await tx.exec(sql); },
          async transaction(inner) { return inner(txClient); },
        };
        return fn(txClient);
      });
    },
  };
}

/** Connect to a hosted Postgres (Neon/Supabase/RDS/etc.) via node-postgres. */
async function postgresClient(connectionString: string): Promise<DbClient> {
  const { Pool } = await import("pg");
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const pool = new Pool({
    connectionString,
    // Managed providers terminate TLS with chains Node won't verify by default.
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 10,
  });

  type PgQueryable = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
  const wrap = (q: PgQueryable): DbClient => ({
    async query(sql, params) {
      const result = await q.query(sql, params);
      return { rows: result.rows as never[] };
    },
    async exec(sql) { await q.query(sql); },
    async transaction(fn) { return fn(wrap(q)); },
  });

  return {
    async query(sql, params) {
      const result = await pool.query(sql, params as unknown[]);
      return { rows: result.rows as never[] };
    },
    async exec(sql) { await pool.query(sql); },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(wrap(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function initializeDatabase(): Promise<DbClient> {
  const url = process.env.DATABASE_URL?.trim();
  let db: DbClient;
  if (url) {
    console.info("[db] Using hosted Postgres via DATABASE_URL");
    db = await postgresClient(url);
  } else {
    console.info("[db] Using embedded PGlite (.data) — set DATABASE_URL to use hosted Postgres");
    // Lazy import: keeps the ~10 MB WASM engine out of serverless bundles,
    // where DATABASE_URL is always set and this branch never runs.
    const { PGlite } = await import("@electric-sql/pglite");
    const dataRoot = path.join(process.cwd(), ".data");
    mkdirSync(dataRoot, { recursive: true });
    db = pgliteClient(new PGlite(path.join(dataRoot, "budgettracker-pgdata")));
  }
  await db.exec(schema);
  // Backfills for databases created before these columns existed.
  await db.exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';");
  await db.exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;");
  await db.exec("ALTER TABLE household_settings ADD COLUMN IF NOT EXISTS allowed_signin_emails TEXT[] NOT NULL DEFAULT '{}';");
  await db.exec("ALTER TABLE household_settings ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'PH';");
  await db.exec("ALTER TABLE household_settings ADD COLUMN IF NOT EXISTS base_currency TEXT NOT NULL DEFAULT 'PHP';");
  await db.exec("ALTER TABLE household_settings ADD COLUMN IF NOT EXISTS savings_goal NUMERIC(14,2) NOT NULL DEFAULT 0;");
  await db.exec("ALTER TABLE household_settings ADD COLUMN IF NOT EXISTS avatar TEXT;");
  // Onboarding gate. Defaults TRUE so existing households skip the setup wizard;
  // createHousehold sets it FALSE for new sign-ups so they get guided setup first.
  await db.exec("ALTER TABLE household_settings ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT TRUE;");
  await db.exec("ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget_limit NUMERIC(14,2);");
  await db.exec("ALTER TABLE credentials ADD COLUMN IF NOT EXISTS password_set BOOLEAN NOT NULL DEFAULT TRUE;");
  await db.exec("ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;");
  await db.exec("ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS relationship TEXT NOT NULL DEFAULT 'other';");
  await db.exec("ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS budget_role TEXT NOT NULL DEFAULT 'contributor';");
  await db.exec("ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS email TEXT;");
  await db.exec("ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS monthly_contribution NUMERIC(14,2) NOT NULL DEFAULT 0;");
  await db.exec("ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS occupation TEXT;");
  await db.exec("CREATE INDEX IF NOT EXISTS transactions_active_household_date_idx ON transactions(household_id, occurred_at DESC) WHERE deleted_at IS NULL;");
  await db.exec("CREATE INDEX IF NOT EXISTS transactions_active_household_member_date_idx ON transactions(household_id, member_id, occurred_at DESC) WHERE deleted_at IS NULL;");
  await db.exec("CREATE INDEX IF NOT EXISTS transactions_active_household_type_date_idx ON transactions(household_id, type, occurred_at DESC) WHERE deleted_at IS NULL;");
  await db.exec("CREATE INDEX IF NOT EXISTS bills_household_status_date_idx ON bills(household_id, status, due_date);");
  await db.exec("UPDATE member_profiles SET relationship = 'self', budget_role = 'owner' WHERE id = 'member-you' AND relationship = 'other';");
  await db.exec("UPDATE member_profiles SET relationship = 'partner' WHERE id = 'member-partner' AND relationship = 'other';");
  await seedDatabase(db);
  return db;
}

export function getDb() {
  globalThis.budgetTrackerDbPromise ??= initializeDatabase();
  return globalThis.budgetTrackerDbPromise;
}

export async function getCredential(email: string) {
  const db = await getDb();
  const result = await db.query<{ household_id: string; email: string; password_hash: string }>(
    "SELECT household_id, email, password_hash FROM credentials WHERE email = $1 LIMIT 1",
    [email.toLowerCase()],
  );
  return result.rows[0] ?? null;
}

export async function getDashboardData(householdId: string, memberId?: string): Promise<DashboardData> {
  const db = await getDb();
  await db.query("UPDATE bills SET status = 'overdue' WHERE status = 'upcoming' AND due_date < CURRENT_DATE");

  // Optional per-member lens: $2 is NULL for the whole household.
  const scope = [householdId, memberId ?? null];

  const settingsPromise = db.query<{
    name: string; monthly_budget: string; currency: string; reminder_email: string; country: string; base_currency: string; savings_goal: string; avatar: string | null; onboarded: boolean;
  }>(
    `SELECT h.name, s.monthly_budget, s.currency, s.reminder_email, s.country, s.base_currency, s.savings_goal, s.avatar, s.onboarded
     FROM households h JOIN household_settings s ON s.household_id = h.id WHERE h.id = $1`,
    [householdId],
  );
  const totalsPromise = db.query<{ balance: string; income: string; expense: string; previous_expense: string }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance,
       COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND date_trunc('month', occurred_at) = date_trunc('month', CURRENT_DATE)), 0) AS income,
       COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND date_trunc('month', occurred_at) = date_trunc('month', CURRENT_DATE)), 0) AS expense,
       COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND date_trunc('month', occurred_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')), 0) AS previous_expense
     FROM transactions WHERE household_id = $1 AND deleted_at IS NULL AND ($2::text IS NULL OR member_id = $2)`,
    scope,
  );
  const trendRowsPromise = db.query<{ month_date: Date; month: string; income: string; expense: string }>(
    `WITH buckets AS (
       SELECT generate_series(
         date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
         date_trunc('month', CURRENT_DATE),
         INTERVAL '1 month'
       ) AS month_date
     )
     SELECT b.month_date, to_char(b.month_date, 'Mon') AS month,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense
     FROM buckets b
     LEFT JOIN transactions t
       ON t.household_id = $1
       AND t.deleted_at IS NULL
       AND ($2::text IS NULL OR t.member_id = $2)
       AND t.occurred_at >= b.month_date
       AND t.occurred_at < b.month_date + INTERVAL '1 month'
     GROUP BY b.month_date ORDER BY b.month_date`,
    scope,
  );
  const categoryRowsPromise = db.query<{ id: string; name: string; color: string; amount: string }>(
    `SELECT c.id, c.name, c.color, COALESCE(SUM(t.amount), 0) AS amount
     FROM categories c JOIN transactions t ON t.category_id = c.id
     WHERE t.household_id = $1 AND t.deleted_at IS NULL AND t.type = 'expense'
       AND ($2::text IS NULL OR t.member_id = $2)
       AND date_trunc('month', t.occurred_at) = date_trunc('month', CURRENT_DATE)
     GROUP BY c.id, c.name, c.color ORDER BY amount DESC`,
    scope,
  );
  const transactionRowsPromise = db.query<TransactionRow>(
    `${TRANSACTION_SELECT}
     WHERE t.household_id = $1 AND t.deleted_at IS NULL AND ($2::text IS NULL OR t.member_id = $2) ORDER BY t.occurred_at DESC LIMIT 10`,
    scope,
  );
  const billRowsPromise = db.query<{
    id: string; name: string; amount: string; due_date: string | Date; recurrence: BillItem["recurrence"];
    reminder_days: number[]; note: string; status: BillItem["status"]; category_id: string; member_id: string;
  }>(
    "SELECT id, name, amount, due_date, recurrence, reminder_days, note, status, category_id, member_id FROM bills WHERE household_id = $1 AND ($2::text IS NULL OR member_id = $2) AND status <> 'paid' ORDER BY due_date LIMIT 8",
    scope,
  );
  const categoryListPromise = db.query<{ id: string; name: string; color: string; icon: string; kind: Category["kind"]; budget_limit: string | null }>(
    "SELECT id, name, color, icon, kind, budget_limit FROM categories WHERE household_id = $1 ORDER BY kind, name",
    [householdId],
  );
  const memberListPromise = db.query<{
    id: string; name: string; initials: string; color: string;
    relationship: MemberRelationship; budget_role: MemberBudgetRole; email: string | null; occupation: string | null;
    monthly_contribution: string; transaction_count: number; active_bill_count: number;
    month_income: string; month_expense: string;
  }>(
    `SELECT m.id, m.name, m.initials, m.color, m.relationship, m.budget_role, m.email, m.occupation, m.monthly_contribution,
       (SELECT COUNT(*)::int FROM transactions t WHERE t.member_id = m.id AND t.deleted_at IS NULL) AS transaction_count,
       (SELECT COUNT(*)::int FROM bills b WHERE b.member_id = m.id AND b.status <> 'paid') AS active_bill_count,
       (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
        WHERE t.member_id = m.id AND t.deleted_at IS NULL AND t.type = 'income'
          AND date_trunc('month', t.occurred_at) = date_trunc('month', CURRENT_DATE)) AS month_income,
       (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
        WHERE t.member_id = m.id AND t.deleted_at IS NULL AND t.type = 'expense'
          AND date_trunc('month', t.occurred_at) = date_trunc('month', CURRENT_DATE)) AS month_expense
     FROM member_profiles m
     WHERE m.household_id = $1 AND m.active = TRUE
     ORDER BY CASE m.budget_role WHEN 'owner' THEN 0 WHEN 'planner' THEN 1 ELSE 2 END, m.name`,
    [householdId],
  );
  const savingsSummaryPromise = db.query<{ balance: string }>(
    "SELECT COALESCE(SUM(amount), 0) AS balance FROM savings_entries WHERE household_id = $1 AND reversed_at IS NULL",
    [householdId],
  );
  const savingsActivityPromise = db.query<{ id: string; kind: SavingsEntryKind; amount: string; note: string; created_at: Date }>(
    "SELECT id, kind, amount, note, created_at FROM savings_entries WHERE household_id = $1 AND reversed_at IS NULL ORDER BY created_at DESC LIMIT 5",
    [householdId],
  );
  const [
    settings,
    totals,
    trendRows,
    categoryRows,
    transactionRows,
    billRows,
    categoryList,
    memberList,
    savingsSummary,
    savingsActivity,
  ] = await Promise.all([settingsPromise, totalsPromise, trendRowsPromise, categoryRowsPromise, transactionRowsPromise, billRowsPromise, categoryListPromise, memberListPromise, savingsSummaryPromise, savingsActivityPromise]);

  const current = totals.rows[0];
  const monthlyBudget = Number(settings.rows[0].monthly_budget);
  const monthIncome = Number(current.income);
  const monthExpense = Number(current.expense);
  const previousExpense = Number(current.previous_expense);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsed = Math.max(1, now.getDate());
  const expectedPace = elapsed / daysInMonth;
  const utilization = monthlyBudget > 0 ? monthExpense / monthlyBudget : 0;
  const forecast = (monthExpense / elapsed) * daysInMonth;
  const status = monthExpense > monthlyBudget || forecast > monthlyBudget * 1.1
    ? "over"
    : utilization > expectedPace + 0.1 || forecast > monthlyBudget
      ? "watch"
      : "healthy";
  const statusCopy = {
    healthy: ["On track", "Your spending pace is comfortably within this month's plan."],
    watch: ["Keep an eye", "Spending is moving slightly faster than your monthly plan."],
    over: ["Needs attention", "Projected spending is above your monthly budget."],
  } as const;
  const totalCategorySpend = categoryRows.rows.reduce((sum, item) => sum + Number(item.amount), 0);
  const upcomingBillsTotal = billRows.rows.reduce((sum, bill) => sum + Number(bill.amount), 0);

  // Live FX: amounts are stored in the base currency and converted for
  // display. If no rate is available (offline, unknown pair), fall back to
  // showing honest base-currency amounts rather than mislabeled numbers.
  const baseCurrency = settings.rows[0].base_currency ?? "PHP";
  let displayCurrency = settings.rows[0].currency;
  let fxRate = 1;
  let fxUpdatedAt: string | null = null;
  if (displayCurrency !== baseCurrency) {
    const quote = await getFxQuote(baseCurrency, displayCurrency);
    if (quote) {
      fxRate = quote.rate;
      fxUpdatedAt = quote.updatedAt;
    } else {
      displayCurrency = baseCurrency;
    }
  }

  return {
    householdName: settings.rows[0].name,
    avatar: settings.rows[0].avatar ?? null,
    onboarded: settings.rows[0].onboarded ?? true,
    currency: displayCurrency,
    baseCurrency,
    fxRate,
    fxUpdatedAt,
    country: settings.rows[0].country ?? "PH",
    reminderEmail: settings.rows[0].reminder_email,
    monthlyBudget,
    availableBalance: Number(current.balance),
    monthIncome,
    monthExpense,
    budgetRemaining: monthlyBudget - monthExpense,
    upcomingBillsTotal,
    savingsRate: monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0,
    savingsBalance: Number(savingsSummary.rows[0]?.balance ?? 0),
    savingsGoal: Number(settings.rows[0].savings_goal ?? 0),
    savingsActivity: savingsActivity.rows.map((row): SavingsActivity => ({
      id: row.id,
      kind: row.kind,
      amount: Number(row.amount),
      note: row.note,
      createdAt: asIso(row.created_at),
    })),
    spendingChange: previousExpense > 0 ? ((monthExpense - previousExpense) / previousExpense) * 100 : 0,
    forecast,
    safeToSpendDaily: Math.max(0, (monthlyBudget - monthExpense) / Math.max(1, daysInMonth - elapsed + 1)),
    status,
    statusLabel: statusCopy[status][0],
    statusMessage: statusCopy[status][1],
    utilization: utilization * 100,
    trend: trendRows.rows.map((row) => ({ month: row.month, income: Number(row.income), expense: Number(row.expense) })),
    categorySpend: categoryRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      amount: Number(row.amount),
      percentage: totalCategorySpend > 0 ? (Number(row.amount) / totalCategorySpend) * 100 : 0,
    })),
    recentTransactions: transactionRows.rows.map(mapTransactionRow),
    bills: billRows.rows.map((row): BillItem => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      dueDate: typeof row.due_date === "string" ? row.due_date.slice(0, 10) : format(row.due_date, "yyyy-MM-dd"),
      recurrence: row.recurrence,
      reminderDays: row.reminder_days,
      note: row.note,
      status: row.status,
      categoryId: row.category_id,
      memberId: row.member_id,
    })),
    categories: categoryList.rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      kind: row.kind,
      budgetLimit: row.budget_limit === null ? null : Number(row.budget_limit),
    })),
    members: memberList.rows.map((row) => ({
      id: row.id,
      name: row.name,
      initials: row.initials,
      color: row.color,
      relationship: row.relationship,
      budgetRole: row.budget_role,
      email: row.email ?? "",
      occupation: row.occupation ?? "",
      monthlyContribution: Number(row.monthly_contribution),
      transactionCount: Number(row.transaction_count),
      activeBillCount: Number(row.active_bill_count),
      monthIncome: Number(row.month_income),
      monthExpense: Number(row.month_expense),
    })),
    generatedAt: new Date().toISOString(),
  };
}

const cashFlowQueries: Record<CashFlowRange, string> = {
  "1d": `
    WITH buckets AS (
      SELECT generate_series(
        COALESCE($3::date, (NOW() AT TIME ZONE 'Asia/Manila')::date)::timestamp,
        COALESCE($3::date, (NOW() AT TIME ZONE 'Asia/Manila')::date)::timestamp + INTERVAL '23 hours',
        INTERVAL '1 hour') AS bucket
    )
    SELECT b.bucket, to_char(b.bucket, 'FMHH12AM') AS label,
      to_char(b.bucket, 'FMHH12:MI AM') || ' – ' || to_char(b.bucket + INTERVAL '1 hour', 'FMHH12:MI AM') AS detail,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense,
      COUNT(t.id)::int AS tx_count
    FROM buckets b LEFT JOIN transactions t ON t.household_id = $1 AND t.deleted_at IS NULL
      AND (t.occurred_at AT TIME ZONE 'Asia/Manila') >= b.bucket
      AND (t.occurred_at AT TIME ZONE 'Asia/Manila') < b.bucket + INTERVAL '1 hour'
    GROUP BY b.bucket ORDER BY b.bucket`,
  "7d": `
    WITH buckets AS (
      SELECT generate_series(COALESCE($3::date, CURRENT_DATE) - INTERVAL '6 days', COALESCE($3::date, CURRENT_DATE), INTERVAL '1 day') AS bucket
    )
    SELECT b.bucket, to_char(b.bucket, 'Dy') AS label,
      to_char(b.bucket, 'FMDay · Mon FMDD') AS detail,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense,
      COUNT(t.id)::int AS tx_count
    FROM buckets b LEFT JOIN transactions t ON t.household_id = $1 AND t.deleted_at IS NULL
      AND t.occurred_at >= b.bucket AND t.occurred_at < b.bucket + INTERVAL '1 day'
    GROUP BY b.bucket ORDER BY b.bucket`,
  "4w": `
    WITH buckets AS (
      SELECT generate_series(date_trunc('week', COALESCE($3::date, CURRENT_DATE)) - INTERVAL '3 weeks', date_trunc('week', COALESCE($3::date, CURRENT_DATE)), INTERVAL '1 week') AS bucket
    )
    SELECT b.bucket, to_char(b.bucket, 'Mon DD') AS label,
      'Week of ' || to_char(b.bucket, 'Mon FMDD') || ' – ' || to_char(b.bucket + INTERVAL '6 days', 'Mon FMDD') AS detail,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense,
      COUNT(t.id)::int AS tx_count
    FROM buckets b LEFT JOIN transactions t ON t.household_id = $1 AND t.deleted_at IS NULL
      AND t.occurred_at >= b.bucket AND t.occurred_at < b.bucket + INTERVAL '1 week'
    GROUP BY b.bucket ORDER BY b.bucket`,
  "12m": `
    WITH buckets AS (
      SELECT generate_series(date_trunc('month', COALESCE($3::date, CURRENT_DATE)) - INTERVAL '11 months', date_trunc('month', COALESCE($3::date, CURRENT_DATE)), INTERVAL '1 month') AS bucket
    )
    SELECT b.bucket, to_char(b.bucket, 'Mon') AS label,
      to_char(b.bucket, 'FMMonth YYYY') AS detail,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense,
      COUNT(t.id)::int AS tx_count
    FROM buckets b LEFT JOIN transactions t ON t.household_id = $1 AND t.deleted_at IS NULL
      AND t.occurred_at >= b.bucket AND t.occurred_at < b.bucket + INTERVAL '1 month'
    GROUP BY b.bucket ORDER BY b.bucket`,
  "3y": `
    WITH buckets AS (
      SELECT generate_series(date_trunc('year', COALESCE($3::date, CURRENT_DATE)) - INTERVAL '2 years', date_trunc('year', COALESCE($3::date, CURRENT_DATE)), INTERVAL '1 year') AS bucket
    )
    SELECT b.bucket, to_char(b.bucket, 'YYYY') AS label,
      'Year ' || to_char(b.bucket, 'YYYY') AS detail,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense,
      COUNT(t.id)::int AS tx_count
    FROM buckets b LEFT JOIN transactions t ON t.household_id = $1 AND t.deleted_at IS NULL
      AND t.occurred_at >= b.bucket AND t.occurred_at < b.bucket + INTERVAL '1 year'
    GROUP BY b.bucket ORDER BY b.bucket`,
};

export async function getCashFlowData(householdId: string, range: CashFlowRange, memberId?: string, anchor?: string): Promise<CashFlowData> {
  const db = await getDb();
  // Every range query joins transactions with the same fragment, so the
  // optional per-member lens can be injected uniformly. $3 anchors the window
  // to a chosen date (NULL = today), enabling per-day/per-week history browsing.
  const sql = cashFlowQueries[range].replace(
    "LEFT JOIN transactions t ON t.household_id = $1 AND t.deleted_at IS NULL",
    "LEFT JOIN transactions t ON t.household_id = $1 AND t.deleted_at IS NULL AND ($2::text IS NULL OR t.member_id = $2)",
  );
  const result = await db.query<{ label: string; detail: string; income: string; expense: string; tx_count: number }>(sql, [householdId, memberId ?? null, anchor ?? null]);
  const points = result.rows.map((row) => ({
    month: row.label,
    detail: row.detail,
    income: Number(row.income),
    expense: Number(row.expense),
    count: Number(row.tx_count),
  }));
  const income = points.reduce((sum, point) => sum + point.income, 0);
  const expense = points.reduce((sum, point) => sum + point.expense, 0);
  const strongest = points.reduce((best, point) => point.income - point.expense > best.income - best.expense ? point : best, points[0] ?? { month: "-", income: 0, expense: 0 });
  return {
    range,
    points,
    summary: {
      income,
      expense,
      net: income - expense,
      averageExpense: points.length ? expense / points.length : 0,
      strongestPeriod: strongest.month,
    },
  };
}

export type TransactionInput = {
  type: "expense" | "income"; amount: number; categoryId: string; memberId: string;
  note: string; paymentMethod: PaymentMethod; occurredAt: string;
};

export async function createTransaction(householdId: string, input: TransactionInput) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(
    "INSERT INTO transactions (id, household_id, type, amount, category_id, member_id, note, payment_method, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [id, householdId, input.type, input.amount, input.categoryId, input.memberId, input.note, input.paymentMethod, input.occurredAt],
  );
  return id;
}

export type TransactionFilters = {
  search?: string; type?: "expense" | "income"; categoryId?: string; memberId?: string;
  from?: string; to?: string; limit?: number;
};

export async function listTransactions(householdId: string, filters: TransactionFilters): Promise<TransactionItem[]> {
  const db = await getDb();
  const where: string[] = ["t.household_id = $1", "t.deleted_at IS NULL"];
  const params: unknown[] = [householdId];
  if (filters.type) { params.push(filters.type); where.push(`t.type = $${params.length}`); }
  if (filters.categoryId) { params.push(filters.categoryId); where.push(`t.category_id = $${params.length}`); }
  if (filters.memberId) { params.push(filters.memberId); where.push(`t.member_id = $${params.length}`); }
  if (filters.search) { params.push(`%${filters.search}%`); const i = params.length; where.push(`(t.note ILIKE $${i} OR c.name ILIKE $${i})`); }
  if (filters.from) { params.push(filters.from); where.push(`t.occurred_at >= $${params.length}`); }
  if (filters.to) { params.push(filters.to); where.push(`t.occurred_at <= $${params.length}`); }
  const limit = Math.min(500, Math.max(1, filters.limit ?? 200));
  const result = await db.query<TransactionRow>(
    `${TRANSACTION_SELECT} WHERE ${where.join(" AND ")} ORDER BY t.occurred_at DESC LIMIT ${limit}`,
    params,
  );
  return result.rows.map(mapTransactionRow);
}

export type MutationResult = "ok" | "not_found" | "bill_locked";

export async function updateTransaction(householdId: string, id: string, input: TransactionInput): Promise<MutationResult> {
  const db = await getDb();
  const existing = await db.query<{ bill_id: string | null }>(
    "SELECT bill_id FROM transactions WHERE id = $1 AND household_id = $2 AND deleted_at IS NULL",
    [id, householdId],
  );
  const row = existing.rows[0];
  if (!row) return "not_found";
  if (row.bill_id) return "bill_locked";
  await db.query(
    "UPDATE transactions SET type = $1, amount = $2, category_id = $3, member_id = $4, note = $5, payment_method = $6, occurred_at = $7 WHERE id = $8 AND household_id = $9 AND deleted_at IS NULL",
    [input.type, input.amount, input.categoryId, input.memberId, input.note, input.paymentMethod, input.occurredAt, id, householdId],
  );
  return "ok";
}

export async function deleteTransaction(householdId: string, id: string): Promise<MutationResult> {
  const db = await getDb();
  const existing = await db.query<{ bill_id: string | null }>(
    "SELECT bill_id FROM transactions WHERE id = $1 AND household_id = $2 AND deleted_at IS NULL",
    [id, householdId],
  );
  const row = existing.rows[0];
  if (!row) return "not_found";
  if (row.bill_id) return "bill_locked";
  await db.query("UPDATE transactions SET deleted_at = NOW() WHERE id = $1 AND household_id = $2", [id, householdId]);
  return "ok";
}

export async function restoreTransaction(householdId: string, id: string): Promise<MutationResult> {
  const db = await getDb();
  const existing = await db.query<{ bill_id: string | null; deleted_at: Date | null }>(
    "SELECT bill_id, deleted_at FROM transactions WHERE id = $1 AND household_id = $2",
    [id, householdId],
  );
  const row = existing.rows[0];
  if (!row) return "not_found";
  if (row.bill_id) return "bill_locked";
  if (!row.deleted_at) return "ok";
  await db.query("UPDATE transactions SET deleted_at = NULL WHERE id = $1 AND household_id = $2", [id, householdId]);
  return "ok";
}

export async function createBill(householdId: string, input: {
  name: string; amount: number; categoryId: string; memberId: string; dueDate: string;
  recurrence: BillItem["recurrence"]; reminderDays: number[]; note: string;
}) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(
    "INSERT INTO bills (id, household_id, name, amount, category_id, member_id, due_date, recurrence, reminder_days, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    [id, householdId, input.name, input.amount, input.categoryId, input.memberId, input.dueDate, input.recurrence, input.reminderDays, input.note],
  );
  return id;
}

const RECURRENCE_INTERVALS: Record<string, string> = {
  monthly: "1 month",
  quarterly: "3 months",
  yearly: "1 year",
};

export async function payBill(householdId: string, id: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const result = await tx.query<{
      id: string; amount: string; category_id: string; member_id: string; name: string; status: string;
      recurrence: string; due_date: string | Date; reminder_days: number[]; note: string;
    }>(
      "SELECT id, amount, category_id, member_id, name, status, recurrence, due_date, reminder_days, note FROM bills WHERE id = $1 AND household_id = $2 FOR UPDATE",
      [id, householdId],
    );
    const bill = result.rows[0];
    if (!bill) throw new Error("Bill not found");
    if (bill.status === "paid") return false;
    await tx.query("UPDATE bills SET status = 'paid', paid_at = NOW() WHERE id = $1", [id]);
    await tx.query(
      "INSERT INTO transactions (id, household_id, type, amount, category_id, member_id, note, occurred_at, bill_id) VALUES ($1,$2,'expense',$3,$4,$5,$6,NOW(),$7)",
      [crypto.randomUUID(), householdId, bill.amount, bill.category_id, bill.member_id, `${bill.name} payment`, id],
    );
    // Recurring bills roll forward: paying this cycle schedules the next one,
    // so reminders keep working month after month without re-entry.
    const interval = RECURRENCE_INTERVALS[bill.recurrence];
    if (interval) {
      await tx.query(
        `INSERT INTO bills (id, household_id, name, amount, category_id, member_id, due_date, recurrence, reminder_days, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7::date + $8::interval, $9, $10, $11)`,
        [crypto.randomUUID(), householdId, bill.name, bill.amount, bill.category_id, bill.member_id, bill.due_date, interval, bill.recurrence, bill.reminder_days, bill.note],
      );
    }
    return true;
  });
}

export async function updateSettings(householdId: string, monthlyBudget: number, reminderEmail: string, country?: string, currency?: string) {
  const db = await getDb();
  await db.query(
    `UPDATE household_settings SET monthly_budget = $1, reminder_email = $2,
       country = COALESCE($3, country), currency = COALESCE($4, currency)
     WHERE household_id = $5`,
    [monthlyBudget, reminderEmail, country ?? null, currency ?? null, householdId],
  );
}

export type SavingsEntryInput =
  | { kind: "deposit" | "withdrawal"; amount: number; note: string }
  | { kind: "correction"; targetBalance: number; note: string };

export type SavingsMutationResult =
  | { id: string; balance: number }
  | "no_change"
  | "insufficient";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Append-only savings ledger. Corrections record only the delta, preserving history. */
export async function createSavingsEntry(householdId: string, input: SavingsEntryInput): Promise<SavingsMutationResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM households WHERE id = $1 FOR UPDATE", [householdId]);
    const total = await tx.query<{ balance: string }>(
      "SELECT COALESCE(SUM(amount), 0) AS balance FROM savings_entries WHERE household_id = $1 AND reversed_at IS NULL",
      [householdId],
    );
    const currentBalance = Number(total.rows[0]?.balance ?? 0);
    const amount = input.kind === "correction"
      ? roundMoney(input.targetBalance - currentBalance)
      : roundMoney(input.kind === "deposit" ? input.amount : -input.amount);
    if (amount === 0) return "no_change";

    const balance = roundMoney(currentBalance + amount);
    if (balance < 0) return "insufficient";

    const id = crypto.randomUUID();
    await tx.query(
      "INSERT INTO savings_entries (id, household_id, kind, amount, note) VALUES ($1, $2, $3, $4, $5)",
      [id, householdId, input.kind, amount, input.note.trim()],
    );
    return { id, balance };
  });
}

export async function updateSavingsGoal(householdId: string, savingsGoal: number) {
  const db = await getDb();
  await db.query(
    "UPDATE household_settings SET savings_goal = $1 WHERE household_id = $2",
    [roundMoney(savingsGoal), householdId],
  );
}

export type ReverseSavingsResult = "ok" | "not_found" | "would_be_negative";

/** Soft-reverse an entry so Undo never destroys the financial audit trail. */
export async function reverseSavingsEntry(householdId: string, id: string): Promise<ReverseSavingsResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM households WHERE id = $1 FOR UPDATE", [householdId]);
    const entry = await tx.query<{ amount: string }>(
      "SELECT amount FROM savings_entries WHERE id = $1 AND household_id = $2 AND reversed_at IS NULL",
      [id, householdId],
    );
    if (!entry.rows[0]) return "not_found";

    const total = await tx.query<{ balance: string }>(
      "SELECT COALESCE(SUM(amount), 0) AS balance FROM savings_entries WHERE household_id = $1 AND reversed_at IS NULL",
      [householdId],
    );
    if (roundMoney(Number(total.rows[0]?.balance ?? 0) - Number(entry.rows[0].amount)) < 0) return "would_be_negative";

    await tx.query(
      "UPDATE savings_entries SET reversed_at = NOW() WHERE id = $1 AND household_id = $2 AND reversed_at IS NULL",
      [id, householdId],
    );
    return "ok";
  });
}

/** Set (or clear, with null) a category's monthly envelope allocation. */
export async function setCategoryAllocation(householdId: string, id: string, amount: number | null): Promise<"ok" | "not_found"> {
  const db = await getDb();
  const existing = await db.query<{ id: string }>(
    "SELECT id FROM categories WHERE id = $1 AND household_id = $2",
    [id, householdId],
  );
  if (!existing.rows[0]) return "not_found";
  await db.query(
    "UPDATE categories SET budget_limit = $1 WHERE id = $2 AND household_id = $3",
    [amount, id, householdId],
  );
  return "ok";
}

export type CategoryMutationResult = "ok" | "not_found" | { inUse: number };

export async function createCategory(householdId: string, input: { name: string; color: string; kind: "expense" | "income" }) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(
    "INSERT INTO categories (id, household_id, name, color, icon, kind) VALUES ($1, $2, $3, $4, 'tag', $5)",
    [id, householdId, input.name.trim(), input.color, input.kind],
  );
  return id;
}

export async function updateCategory(householdId: string, id: string, input: { name: string; color: string }): Promise<CategoryMutationResult> {
  const db = await getDb();
  const existing = await db.query<{ id: string }>(
    "SELECT id FROM categories WHERE id = $1 AND household_id = $2",
    [id, householdId],
  );
  if (!existing.rows[0]) return "not_found";
  await db.query(
    "UPDATE categories SET name = $1, color = $2 WHERE id = $3 AND household_id = $4",
    [input.name.trim(), input.color, id, householdId],
  );
  return "ok";
}

export async function deleteCategory(householdId: string, id: string): Promise<CategoryMutationResult> {
  const db = await getDb();
  const existing = await db.query<{ id: string }>(
    "SELECT id FROM categories WHERE id = $1 AND household_id = $2",
    [id, householdId],
  );
  if (!existing.rows[0]) return "not_found";
  // A category referenced by history can't be removed — that would orphan records.
  const usage = await db.query<{ total: number }>(
    `SELECT (
       (SELECT COUNT(*) FROM transactions WHERE category_id = $1 AND household_id = $2)
       + (SELECT COUNT(*) FROM bills WHERE category_id = $1 AND household_id = $2)
     )::int AS total`,
    [id, householdId],
  );
  const inUse = Number(usage.rows[0]?.total ?? 0);
  if (inUse > 0) return { inUse };
  await db.query("DELETE FROM categories WHERE id = $1 AND household_id = $2", [id, householdId]);
  return "ok";
}

export async function updateProfile(householdId: string, householdName: string, members: Array<{
  id: string; name: string;
  relationship: MemberRelationship; budgetRole: MemberBudgetRole;
  email: string; monthlyContribution: number;
}>, avatar?: string | null) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.query("UPDATE households SET name = $1 WHERE id = $2", [householdName, householdId]);
    if (avatar !== undefined) {
      // null/empty clears the avatar (falls back to initials); otherwise a data URL or emoji.
      await tx.query("UPDATE household_settings SET avatar = $1 WHERE household_id = $2", [avatar || null, householdId]);
    }
    const existingMembers = await tx.query<{ id: string }>(
      "SELECT id FROM member_profiles WHERE household_id = $1",
      [householdId],
    );
    const activeIds = new Set(members.map((member) => member.id));
    for (const [index, member] of members.entries()) {
      const initials = member.name.trim().slice(0, 2).toUpperCase();
      await tx.query(
        "INSERT INTO member_profiles (id, household_id, name, initials, color, relationship, budget_role, email, monthly_contribution, active) " +
          "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) " +
          "ON CONFLICT (id) DO UPDATE SET " +
          "name = EXCLUDED.name, initials = EXCLUDED.initials, relationship = EXCLUDED.relationship, budget_role = EXCLUDED.budget_role, " +
          "email = EXCLUDED.email, monthly_contribution = EXCLUDED.monthly_contribution, active = TRUE " +
          "WHERE member_profiles.household_id = EXCLUDED.household_id",
        [
          member.id, householdId, member.name.trim(), initials,
          MEMBER_COLORS[index % MEMBER_COLORS.length],
          member.relationship, member.budgetRole, member.email || null, member.monthlyContribution,
        ],
      );
    }
    for (const existing of existingMembers.rows) {
      if (!activeIds.has(existing.id)) {
        await tx.query(
          "UPDATE member_profiles SET active = FALSE WHERE id = $1 AND household_id = $2",
          [existing.id, householdId],
        );
      }
    }
  });
}

export async function getBaseCurrency(householdId: string): Promise<string> {
  const db = await getDb();
  const result = await db.query<{ base_currency: string }>(
    "SELECT base_currency FROM household_settings WHERE household_id = $1",
    [householdId],
  );
  return result.rows[0]?.base_currency ?? "PHP";
}

export async function getSecurityInfo(householdId: string) {
  const db = await getDb();
  const result = await db.query<{ email: string; allowed_signin_emails: string[] }>(
    `SELECT c.email, s.allowed_signin_emails
     FROM credentials c JOIN household_settings s ON s.household_id = c.household_id
     WHERE c.household_id = $1 LIMIT 1`,
    [householdId],
  );
  const row = result.rows[0];
  return { loginEmail: row.email, allowedEmails: row.allowed_signin_emails ?? [] };
}

/** Is this email allowed to sign in via OAuth? (Login email or explicitly allowed.) */
export async function isEmailAllowed(householdId: string, email: string) {
  const info = await getSecurityInfo(householdId);
  const normalized = email.trim().toLowerCase();
  return info.loginEmail === normalized || info.allowedEmails.includes(normalized);
}

const DEFAULT_CATEGORIES: Array<[string, string, string, "expense" | "income"]> = [
  ["Food & Dining", "#D77A58", "utensils", "expense"],
  ["Transport", "#5B83A6", "car", "expense"],
  ["Shopping", "#D6A84B", "shopping-bag", "expense"],
  ["Home", "#8B78A8", "house", "expense"],
  ["Health", "#D25D64", "heart-pulse", "expense"],
  ["Leisure", "#4D9A8B", "sparkles", "expense"],
  ["Others", "#7C837F", "ellipsis", "expense"],
  ["Salary", "#16A368", "briefcase-business", "income"],
  ["Other Income", "#3C8F76", "circle-plus", "income"],
];

/**
 * Provision a brand-new household: its own settings, default members, and
 * category set. Used by email sign-up and by Google sign-in for emails no
 * household knows yet. `passwordHash: null` marks an OAuth-created account
 * (password_set=false) so the owner can set a password later without
 * knowing the random placeholder.
 */
export async function createHousehold(input: {
  email: string;
  passwordHash: string | null;
  householdName?: string;
}): Promise<string> {
  const db = await getDb();
  const householdId = crypto.randomUUID();
  const email = input.email.trim().toLowerCase();
  const passwordSet = input.passwordHash !== null;
  const passwordHash = input.passwordHash ?? (await hash(crypto.randomUUID() + crypto.randomUUID(), 12));
  await db.transaction(async (tx) => {
    await tx.query("INSERT INTO households (id, name) VALUES ($1, $2)", [householdId, input.householdName?.trim() || "Our Household"]);
    await tx.query(
      "INSERT INTO credentials (id, household_id, email, password_hash, password_set) VALUES ($1, $2, $3, $4, $5)",
      [crypto.randomUUID(), householdId, email, passwordHash, passwordSet],
    );
    await tx.query(
      "INSERT INTO household_settings (household_id, monthly_budget, reminder_email, onboarded) VALUES ($1, $2, $3, FALSE)",
      [householdId, 50000, email],
    );
    const members: Array<[string, string, string, string, string]> = [
      ["You", "YO", "#1D2924", "self", "owner"],
      ["Partner", "PA", "#D77A58", "partner", "contributor"],
    ];
    for (const [name, initials, color, relationship, role] of members) {
      await tx.query(
        "INSERT INTO member_profiles (id, household_id, name, initials, color, relationship, budget_role) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [crypto.randomUUID(), householdId, name, initials, color, relationship, role],
      );
    }
    for (const [name, color, icon, kind] of DEFAULT_CATEGORIES) {
      await tx.query(
        "INSERT INTO categories (id, household_id, name, color, icon, kind) VALUES ($1, $2, $3, $4, $5, $6)",
        [crypto.randomUUID(), householdId, name, color, icon, kind],
      );
    }
  });
  return householdId;
}

/**
 * Finish first-run setup for a new household in one transaction: the owner's
 * name + occupation, an optional partner, the household name, country/currency
 * (stored natively as the base currency so amounts need no conversion), monthly
 * budget, opening savings balance + goal, and reminder email — then flip
 * `onboarded` TRUE so the setup wizard never shows again.
 */
export async function completeOnboarding(householdId: string, input: {
  firstName: string; lastName: string; occupation?: string;
  householdName: string; country: string; currency: string;
  monthlyBudget: number; currentSavings?: number; savingsGoal?: number; reminderEmail?: string;
  partner?: { firstName: string; lastName: string; occupation?: string };
}): Promise<void> {
  const db = await getDb();
  const initials = (a: string, b: string) => `${a.trim()[0] ?? ""}${b.trim()[0] ?? ""}`.toUpperCase() || "BT";
  const selfName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  await db.transaction(async (tx) => {
    await tx.query("UPDATE households SET name = $1 WHERE id = $2", [input.householdName.trim(), householdId]);
    // The signup seed created a 'self' member and a 'partner' member; personalise them.
    await tx.query(
      "UPDATE member_profiles SET name = $1, initials = $2, occupation = $3 WHERE household_id = $4 AND relationship = 'self'",
      [selfName, initials(input.firstName, input.lastName), input.occupation?.trim() || null, householdId],
    );
    if (input.partner) {
      const partnerName = `${input.partner.firstName.trim()} ${input.partner.lastName.trim()}`.trim();
      await tx.query(
        "UPDATE member_profiles SET name = $1, initials = $2, occupation = $3, active = TRUE WHERE household_id = $4 AND relationship = 'partner'",
        [partnerName, initials(input.partner.firstName, input.partner.lastName), input.partner.occupation?.trim() || null, householdId],
      );
    } else {
      await tx.query("UPDATE member_profiles SET active = FALSE WHERE household_id = $1 AND relationship = 'partner'", [householdId]);
    }
    await tx.query(
      `UPDATE household_settings SET base_currency = $1, currency = $1, country = $2, monthly_budget = $3,
         savings_goal = $4, reminder_email = COALESCE($5, reminder_email), onboarded = TRUE
       WHERE household_id = $6`,
      [input.currency, input.country, input.monthlyBudget, input.savingsGoal ?? 0, input.reminderEmail ?? null, householdId],
    );
    if (input.currentSavings && input.currentSavings > 0) {
      await tx.query(
        "INSERT INTO savings_entries (id, household_id, kind, amount, note) VALUES ($1, $2, 'deposit', $3, $4)",
        [crypto.randomUUID(), householdId, input.currentSavings, "Opening balance"],
      );
    }
  });
}

/**
 * Find which household an email belongs to: the household whose login
 * credential uses it, or the first household that has whitelisted it.
 */
export async function findHouseholdForEmail(email: string): Promise<string | null> {
  const db = await getDb();
  const normalized = email.trim().toLowerCase();
  const credential = await db.query<{ household_id: string }>(
    "SELECT household_id FROM credentials WHERE email = $1 LIMIT 1",
    [normalized],
  );
  if (credential.rows[0]) return credential.rows[0].household_id;
  const allowed = await db.query<{ household_id: string }>(
    "SELECT household_id FROM household_settings WHERE $1 = ANY(allowed_signin_emails) LIMIT 1",
    [normalized],
  );
  return allowed.rows[0]?.household_id ?? null;
}

/** Map an OAuth-verified email to a session for whichever household knows it. */
export async function resolveOAuthSession(email: string) {
  const normalized = email.trim().toLowerCase();
  const householdId = await findHouseholdForEmail(normalized);
  return householdId ? { householdId, email: normalized } : null;
}

export type CredentialUpdateResult = "ok" | "wrong_password";

export async function updateCredential(householdId: string, input: {
  currentPassword: string; newEmail?: string; newPassword?: string; allowedEmails?: string[];
}): Promise<CredentialUpdateResult> {
  const db = await getDb();
  const existing = await db.query<{ id: string; password_hash: string; password_set: boolean }>(
    "SELECT id, password_hash, password_set FROM credentials WHERE household_id = $1 LIMIT 1",
    [householdId],
  );
  const credential = existing.rows[0];
  if (!credential) return "wrong_password";
  // Accounts created via Google sign-in have a random placeholder password
  // (password_set=false); their first change skips the current-password check
  // since the session itself already proved account ownership.
  if (credential.password_set && !(await compare(input.currentPassword, credential.password_hash))) return "wrong_password";
  await db.transaction(async (tx) => {
    if (input.newEmail) {
      await tx.query("UPDATE credentials SET email = $1 WHERE id = $2", [input.newEmail.trim().toLowerCase(), credential.id]);
    }
    if (input.newPassword) {
      await tx.query("UPDATE credentials SET password_hash = $1, password_set = TRUE WHERE id = $2", [await hash(input.newPassword, 12), credential.id]);
    }
    if (input.allowedEmails) {
      await tx.query(
        "UPDATE household_settings SET allowed_signin_emails = $1 WHERE household_id = $2",
        [input.allowedEmails.map((e) => e.trim().toLowerCase()).filter(Boolean), householdId],
      );
    }
  });
  return "ok";
}

/**
 * Permanently delete a household and everything in it. Requires the current
 * password unless the account was Google-created and never set one (the
 * session already proves ownership there). All child rows — credentials,
 * members, categories, settings, bills, transactions, savings — are removed
 * by the ON DELETE CASCADE foreign keys.
 */
export async function deleteHousehold(householdId: string, currentPassword: string): Promise<"ok" | "wrong_password"> {
  const db = await getDb();
  const existing = await db.query<{ password_hash: string; password_set: boolean }>(
    "SELECT password_hash, password_set FROM credentials WHERE household_id = $1 LIMIT 1",
    [householdId],
  );
  const credential = existing.rows[0];
  if (!credential) return "wrong_password";
  if (credential.password_set && !(await compare(currentPassword, credential.password_hash))) return "wrong_password";
  await db.query("DELETE FROM households WHERE id = $1", [householdId]);
  return "ok";
}

export async function getPendingBillReminders() {
  const db = await getDb();
  const result = await db.query<{
    id: string; name: string; amount: string; due_date: string | Date; reminder_days: number[]; reminder_email: string;
  }>(
    `SELECT b.id, b.name, b.amount, b.due_date, b.reminder_days, s.reminder_email
     FROM bills b JOIN household_settings s ON s.household_id = b.household_id
     WHERE b.status <> 'paid' AND b.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pending = [];
  for (const row of result.rows) {
    const dueDate = typeof row.due_date === "string" ? row.due_date.slice(0, 10) : format(row.due_date, "yyyy-MM-dd");
    const due = new Date(`${dueDate}T00:00:00+08:00`);
    const reminderDay = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    if (!row.reminder_days.includes(reminderDay)) continue;
    const sent = await db.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM reminder_logs WHERE bill_id = $1 AND reminder_day = $2",
      [row.id, reminderDay],
    );
    if (Number(sent.rows[0].count) === 0) pending.push({ ...row, amount: Number(row.amount), dueDate, reminderDay });
  }
  return pending;
}

export async function recordReminder(billId: string, reminderDay: number, sentTo: string) {
  const db = await getDb();
  await db.query(
    "INSERT INTO reminder_logs (id, bill_id, reminder_day, sent_to) VALUES ($1,$2,$3,$4) ON CONFLICT (bill_id, reminder_day) DO NOTHING",
    [crypto.randomUUID(), billId, reminderDay, sentTo],
  );
}
