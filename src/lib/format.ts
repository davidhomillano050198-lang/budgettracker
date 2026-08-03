const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(currency: string, compact: boolean, showCents: boolean) {
  const key = `${currency}:${compact ? "compact" : "standard"}:${showCents ? 2 : 0}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : { maximumFractionDigits: showCents ? 2 : 0 }),
    });
    numberFormatters.set(key, formatter);
  }
  return formatter;
}
export const currencySymbol = (currency: string) =>
  getNumberFormatter(currency, false, false)
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? "₱";

/** Fixed-width masked amount (₱ ••••••) for balance-privacy displays. */
export const maskedAmount = (currency = "PHP") => `${currencySymbol(currency)} ••••••`;

/**
 * Live display conversion. Amounts are stored in the household's base
 * currency; when a different display currency is active, every formatter
 * multiplies by the current market rate. Set from dashboard data during
 * render so the server and client always agree.
 */
let displayFxRate = 1;

export const setDisplayFxRate = (rate: number) => { displayFxRate = Number.isFinite(rate) && rate > 0 ? rate : 1; };
export const getDisplayFxRate = () => displayFxRate;

/** Base-currency amount → display-currency amount (for input prefills). */
export const toDisplayAmount = (value: number) => Math.round(value * displayFxRate * 100) / 100;
/** Display-currency amount (as typed by the user) → base-currency amount. */
export const toBaseAmount = (value: number) => Math.round((value / displayFxRate) * 100) / 100;

export const formatCurrency = (value: number, currency = "PHP") =>
  getNumberFormatter(currency, false, displayFxRate !== 1).format(value * displayFxRate);

export const formatCompactCurrency = (value: number, currency = "PHP") =>
  getNumberFormatter(currency, true, false).format(value * displayFxRate);

export const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const resolvedOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  };
  const key = JSON.stringify(resolvedOptions);
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-PH", resolvedOptions);
    dateFormatters.set(key, formatter);
  }
  return formatter.format(new Date(value));
};

export const formatRelativeDueDate = (dateValue: string) => {
  const due = new Date(`${dateValue}T00:00:00+08:00`);
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
};
