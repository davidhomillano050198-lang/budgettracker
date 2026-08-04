import { Resend } from "resend";
import { NextResponse } from "next/server";
import { getPendingBillReminders, recordReminder } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { renderBillReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  const secret = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Absolute origin so the hosted logo + CTA resolve inside email clients.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "budgettracker-five-zeta.vercel.app";
  const base = process.env.APP_BASE_URL ?? `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const url = new URL(request.url);
  const from = process.env.REMINDER_FROM_EMAIL ?? "BudgetTracker <reminders@budgettracker.app>";

  // Test mode: ?test=1&to=addr sends one sample reminder using the real template
  // (verifies delivery + branding without needing a due bill). Still auth-gated.
  const testTo = url.searchParams.get("test") ? url.searchParams.get("to") : null;
  if (testTo) {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 400 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const recipients = testTo.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
    const html = renderBillReminderEmail({
      name: "Condo dues", amount: formatCurrency(2800), dueCopy: "due in 3 days",
      dueDate: "2026-08-07", recurrence: "Monthly", base,
    });
    const result = await resend.emails.send({
      from, to: recipients, subject: "Condo dues is due in 3 days",
      html,
    });
    return NextResponse.json({ test: true, to: recipients, id: result.data?.id ?? null, error: result.error ?? null });
  }

  const reminders = await getPendingBillReminders();
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: 0, preview: reminders, message: "Set RESEND_API_KEY to enable delivery." });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const sent: string[] = [];
  for (const bill of reminders) {
    const dueCopy = bill.reminderDay === 0 ? "due today" : `due in ${bill.reminderDay} days`;
    // reminder_email may hold several recipients ("a@x.com, b@y.com").
    const recipients = bill.reminder_email.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
    const result = await resend.emails.send({
      from,
      to: recipients,
      subject: `${bill.name} is ${dueCopy}`,
      html: renderBillReminderEmail({
        name: bill.name,
        amount: formatCurrency(bill.amount),
        dueCopy,
        dueDate: bill.dueDate,
        base,
      }),
    });
    if (!result.error) {
      await recordReminder(bill.id, bill.reminderDay, bill.reminder_email);
      sent.push(bill.id);
    }
  }
  return NextResponse.json({ sent: sent.length, billIds: sent });
}
