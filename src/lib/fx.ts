import "server-only";

/**
 * Live exchange rates for display conversion.
 *
 * Amounts are STORED in the household's base currency (the currency data was
 * entered in) and CONVERTED for display at the current market rate whenever a
 * different currency is selected. Rates come from the free open.er-api.com
 * feed (updates daily) and are cached in-process for six hours.
 */

type FxCacheEntry = {
  fetchedAt: number;
  updatedAt: string | null;
  rates: Record<string, number>;
};

declare global {
  var budgetTrackerFxCache: Record<string, FxCacheEntry> | undefined;
}

const TTL_MS = 6 * 60 * 60 * 1000;

async function loadRates(base: string): Promise<FxCacheEntry | null> {
  globalThis.budgetTrackerFxCache ??= {};
  const cached = globalThis.budgetTrackerFxCache[base];
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached;
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {
      // Server-side fetch; avoid Next data-cache so our own TTL governs freshness.
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return cached ?? null;
    const payload = (await response.json()) as {
      result?: string; rates?: Record<string, number>; time_last_update_utc?: string;
    };
    if (payload.result !== "success" || !payload.rates) return cached ?? null;
    const entry: FxCacheEntry = {
      fetchedAt: Date.now(),
      updatedAt: payload.time_last_update_utc ?? null,
      rates: payload.rates,
    };
    globalThis.budgetTrackerFxCache[base] = entry;
    return entry;
  } catch {
    // Offline or provider down — serve the stale cache if we have one.
    return cached ?? null;
  }
}

export type FxQuote = { rate: number; updatedAt: string | null };

/** Rate multiplier from `base` to `target`, or null when unavailable. */
export async function getFxQuote(base: string, target: string): Promise<FxQuote | null> {
  if (base === target) return { rate: 1, updatedAt: null };
  const entry = await loadRates(base);
  const rate = entry?.rates[target];
  if (!rate || !Number.isFinite(rate)) return null;
  return { rate, updatedAt: entry?.updatedAt ?? null };
}
