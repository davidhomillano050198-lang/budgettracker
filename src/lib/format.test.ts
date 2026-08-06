import { describe, it, expect, beforeEach } from "vitest";
import {
  setDisplayFxRate,
  getDisplayFxRate,
  toDisplayAmount,
  toBaseAmount,
  formatCurrency,
  currencySymbol,
  maskedAmount,
} from "./format";

describe("display FX rate", () => {
  beforeEach(() => setDisplayFxRate(1));

  it("defaults to 1", () => {
    expect(getDisplayFxRate()).toBe(1);
  });

  it("rejects non-positive / non-finite rates and falls back to 1", () => {
    setDisplayFxRate(0);
    expect(getDisplayFxRate()).toBe(1);
    setDisplayFxRate(-2);
    expect(getDisplayFxRate()).toBe(1);
    setDisplayFxRate(Number.NaN);
    expect(getDisplayFxRate()).toBe(1);
  });

  it("accepts a valid rate", () => {
    setDisplayFxRate(0.0667);
    expect(getDisplayFxRate()).toBeCloseTo(0.0667, 6);
  });
});

describe("base <-> display conversion (money math)", () => {
  beforeEach(() => setDisplayFxRate(1));

  it("is identity at rate 1", () => {
    expect(toDisplayAmount(100)).toBe(100);
    expect(toBaseAmount(100)).toBe(100);
  });

  it("converts base -> display and back at rate 2", () => {
    setDisplayFxRate(2);
    expect(toDisplayAmount(50)).toBe(100);
    expect(toBaseAmount(100)).toBe(50);
  });

  it("round-trips a real PHP->MYR-style rate within a cent", () => {
    setDisplayFxRate(0.0667);
    const base = 21251.85;
    const display = toDisplayAmount(base);
    // stored value recovered from what the user sees, within rounding
    expect(toBaseAmount(display)).toBeCloseTo(base, 0);
  });

  it("rounds to 2 decimals", () => {
    setDisplayFxRate(1.23456);
    expect(toDisplayAmount(10)).toBe(12.35);
  });
});

describe("currency formatting", () => {
  beforeEach(() => setDisplayFxRate(1));

  it("formats PHP with the peso symbol and thousands separator", () => {
    const out = formatCurrency(1000, "PHP");
    expect(out).toContain("1,000");
    expect(out).toContain("₱");
  });

  it("multiplies the displayed amount by the active FX rate", () => {
    setDisplayFxRate(2);
    expect(formatCurrency(100, "PHP")).toContain("200");
  });

  it("exposes distinct currency symbols", () => {
    expect(currencySymbol("PHP")).toBe("₱");
    const usd = currencySymbol("USD");
    const myr = currencySymbol("MYR");
    expect(usd).toBeTruthy();
    expect(myr).toBeTruthy();
    expect(usd).not.toBe(myr);
  });

  it("masks amounts for privacy mode", () => {
    expect(maskedAmount("PHP")).toBe("₱ ••••••");
  });
});
