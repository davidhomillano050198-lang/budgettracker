export type HealthStatus = "healthy" | "watch" | "over";

export type MemberIdentity = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type MemberRelationship =
  | "self"
  | "spouse"
  | "partner"
  | "child"
  | "parent"
  | "sibling"
  | "relative"
  | "friend"
  | "roommate"
  | "other";

export type MemberBudgetRole = "owner" | "planner" | "contributor" | "dependent" | "observer";

export type Member = MemberIdentity & {
  relationship: MemberRelationship;
  budgetRole: MemberBudgetRole;
  email: string;
  monthlyContribution: number;
  transactionCount: number;
  activeBillCount: number;
  monthIncome: number;
  monthExpense: number;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  kind: "expense" | "income";
  /** Monthly envelope allocation in base currency; null/absent = no limit. */
  budgetLimit?: number | null;
};

export type PaymentMethod = "cash" | "card" | "bank" | "ewallet";

export type TransactionItem = {
  id: string;
  type: "expense" | "income";
  amount: number;
  note: string;
  paymentMethod: PaymentMethod;
  occurredAt: string;
  category: Category;
  member: MemberIdentity;
  billId: string | null;
};

export type BillItem = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  recurrence: "once" | "monthly" | "quarterly" | "yearly";
  reminderDays: number[];
  note: string;
  status: "upcoming" | "paid" | "overdue";
  categoryId: string;
  memberId: string;
};

export type TrendPoint = {
  month: string;
  income: number;
  expense: number;
  /** Full-detail bucket label for tooltips (e.g. "Tuesday, Jul 15" or "8:00 AM"). */
  detail?: string;
  /** Number of transactions inside this bucket. */
  count?: number;
};

export type CashFlowRange = "1d" | "7d" | "4w" | "12m" | "3y";
export type CashFlowStyle = "curve" | "line" | "bar";

export type CashFlowData = {
  range: CashFlowRange;
  points: TrendPoint[];
  summary: {
    income: number;
    expense: number;
    net: number;
    averageExpense: number;
    strongestPeriod: string;
  };
};

export type CategorySpend = {
  id: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
};

export type SavingsEntryKind = "deposit" | "withdrawal" | "correction";

export type SavingsActivity = {
  id: string;
  kind: SavingsEntryKind;
  /** Signed base-currency amount: deposits are positive, withdrawals negative. */
  amount: number;
  note: string;
  createdAt: string;
};

export type DashboardData = {
  householdName: string;
  currency: string;
  baseCurrency: string;
  /** Live multiplier from baseCurrency to currency (1 when identical). */
  fxRate: number;
  fxUpdatedAt: string | null;
  country: string;
  reminderEmail: string;
  monthlyBudget: number;
  availableBalance: number;
  monthIncome: number;
  monthExpense: number;
  budgetRemaining: number;
  upcomingBillsTotal: number;
  savingsRate: number;
  savingsBalance: number;
  savingsGoal: number;
  savingsActivity: SavingsActivity[];
  spendingChange: number;
  forecast: number;
  safeToSpendDaily: number;
  status: HealthStatus;
  statusLabel: string;
  statusMessage: string;
  utilization: number;
  trend: TrendPoint[];
  categorySpend: CategorySpend[];
  recentTransactions: TransactionItem[];
  bills: BillItem[];
  categories: Category[];
  members: Member[];
  generatedAt: string;
};
