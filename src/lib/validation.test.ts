import { describe, it, expect } from "vitest";
import { budgetSchema, signupSchema, transactionSchema, profileSchema } from "./validation";

describe("budgetSchema", () => {
  it("accepts a valid budget and normalizes fields", () => {
    const parsed = budgetSchema.safeParse({ monthlyBudget: "65000", reminderEmail: "A@B.com", country: "ph" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.monthlyBudget).toBe(65000);
      expect(parsed.data.reminderEmail).toBe("a@b.com");
      expect(parsed.data.country).toBe("PH");
    }
  });

  it("accepts up to 5 comma-separated reminder emails, lowercased + joined", () => {
    const parsed = budgetSchema.safeParse({ monthlyBudget: 1000, reminderEmail: "Me@x.com, Partner@Y.com" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reminderEmail).toBe("me@x.com, partner@y.com");
  });

  it("rejects more than 5 reminder emails", () => {
    const many = "1@x.com,2@x.com,3@x.com,4@x.com,5@x.com,6@x.com";
    expect(budgetSchema.safeParse({ monthlyBudget: 1000, reminderEmail: many }).success).toBe(false);
  });

  it("rejects an invalid reminder email", () => {
    expect(budgetSchema.safeParse({ monthlyBudget: 1000, reminderEmail: "not-an-email" }).success).toBe(false);
  });

  it("rejects a non-positive budget", () => {
    expect(budgetSchema.safeParse({ monthlyBudget: "-5", reminderEmail: "a@b.com" }).success).toBe(false);
  });
});

describe("transactionSchema", () => {
  const valid = {
    type: "expense",
    amount: "250.50",
    categoryId: "food",
    memberId: "m1",
    note: "Lunch",
    occurredAt: "2026-08-04T10:00:00.000Z",
  };

  it("accepts a valid expense and coerces the amount", () => {
    const parsed = transactionSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(250.5);
  });

  it("rejects a negative amount", () => {
    expect(transactionSchema.safeParse({ ...valid, amount: "-1" }).success).toBe(false);
  });

  it("rejects an unknown type", () => {
    expect(transactionSchema.safeParse({ ...valid, type: "refund" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts a strong password and normalizes the email", () => {
    const parsed = signupSchema.safeParse({ email: "New@User.COM", password: "password12" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("new@user.com");
  });

  it("rejects a password with no number", () => {
    expect(signupSchema.safeParse({ email: "a@b.com", password: "passwordonly" }).success).toBe(false);
  });

  it("rejects a too-short password", () => {
    expect(signupSchema.safeParse({ email: "a@b.com", password: "short1" }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  const owner = {
    id: "m1", name: "David", relationship: "self", budgetRole: "owner",
    email: "", monthlyContribution: 0,
  };

  it("accepts a household with an owner and an optional emoji avatar", () => {
    const parsed = profileSchema.safeParse({ householdName: "Our Household", members: [owner], avatar: "🏠" });
    expect(parsed.success).toBe(true);
  });

  it("rejects a household with no owner", () => {
    const parsed = profileSchema.safeParse({
      householdName: "Our Household",
      members: [{ ...owner, budgetRole: "observer" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty member list", () => {
    expect(profileSchema.safeParse({ householdName: "Our Household", members: [] }).success).toBe(false);
  });
});
