import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

export const signupSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(10).max(128)
    .regex(/[a-zA-Z]/, "Password needs at least one letter")
    .regex(/[0-9]/, "Password needs at least one number"),
  householdName: z.string().trim().min(2).max(60).optional(),
});

export const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive().max(100_000_000),
  categoryId: z.string().min(1).max(80),
  memberId: z.string().min(1).max(80),
  note: z.string().trim().min(2).max(280),
  paymentMethod: z.enum(["cash", "card", "bank", "ewallet"]).default("cash"),
  occurredAt: z.string().datetime(),
});

export const billSchema = z.object({
  name: z.string().trim().min(2).max(100),
  amount: z.coerce.number().positive().max(100_000_000),
  categoryId: z.string().min(1).max(80),
  memberId: z.string().min(1).max(80),
  dueDate: z.string().date(),
  recurrence: z.enum(["once", "monthly", "quarterly", "yearly"]),
  reminderDays: z.array(z.number().int().min(0).max(30)).min(1).max(5),
  note: z.string().trim().max(280),
});

export const budgetSchema = z.object({
  monthlyBudget: z.coerce.number().positive().max(100_000_000),
  // One or more recipient emails (comma / semicolon / newline separated).
  // Stored as a normalized "a@x.com, b@y.com" string; the reminder cron splits it.
  reminderEmail: z.string()
    .transform((value) => value.split(/[,;\n]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))
    .refine((list) => list.length >= 1 && list.length <= 5, "Add between 1 and 5 reminder emails.")
    .refine((list) => list.every((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)), "One of the reminder emails looks invalid.")
    .transform((list) => list.join(", ")),
  country: z.string().length(2).transform((value) => value.toUpperCase()).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
  kind: z.enum(["expense", "income"]),
});

export const allocationSchema = z.object({
  amount: z.union([z.coerce.number().positive().max(100_000_000), z.null()]),
});

const savingsAmount = z.coerce.number().positive().max(100_000_000);
const savingsNote = z.string().trim().min(3, "Add a short reason for the savings record").max(280);

export const savingsEntrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("deposit"), amount: savingsAmount, note: savingsNote }),
  z.object({ kind: z.literal("withdrawal"), amount: savingsAmount, note: savingsNote }),
  z.object({
    kind: z.literal("correction"),
    targetBalance: z.coerce.number().min(0).max(100_000_000),
    note: savingsNote,
  }),
]);

export const savingsGoalSchema = z.object({
  savingsGoal: z.coerce.number().min(0).max(100_000_000),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
});

export const profileSchema = z.object({
  householdName: z.string().trim().min(2).max(60),
  // Household avatar: a small image data URL, a single emoji, or "" to clear.
  avatar: z.string().max(900_000, "That image is too large — pick a smaller one.").optional(),
  members: z.array(z.object({
    id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9-]+$/, "Invalid member ID"),
    name: z.string().trim().min(1).max(40),
    relationship: z.enum(["self", "spouse", "partner", "child", "parent", "sibling", "relative", "friend", "roommate", "other"]),
    budgetRole: z.enum(["owner", "planner", "contributor", "dependent", "observer"]),
    email: z.string().trim().max(120).refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Enter a valid member email address",
    ),
    monthlyContribution: z.coerce.number().min(0).max(100_000_000),
  })).min(1, "Add at least one household member").max(12, "A household can have up to 12 members"),
}).refine((value) => value.members.some((member) => member.budgetRole === "owner"), {
  message: "Assign at least one household owner",
  path: ["members"],
});

export const securitySchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newEmail: z.string().email().transform((value) => value.trim().toLowerCase()).optional(),
  newPassword: z.string().min(10).max(128)
    .regex(/[a-zA-Z]/, "Password needs at least one letter")
    .regex(/[0-9]/, "Password needs at least one number")
    .optional(),
  allowedEmails: z.array(z.string().email()).max(10).optional(),
}).refine((value) => value.newEmail || value.newPassword || value.allowedEmails, {
  message: "Nothing to update",
});
