import { Resend } from "resend";
import { NextResponse } from "next/server";
import { getPendingBillReminders, recordReminder } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

export async function GET(request: Request) {
  const secret = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminders = await getPendingBillReminders();
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: 0, preview: reminders, message: "Set RESEND_API_KEY to enable delivery." });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  // Absolute origin so the hosted logo resolves inside email clients.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "budgettracker-five-zeta.vercel.app";
  const base = process.env.APP_BASE_URL ?? `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const sent: string[] = [];
  for (const bill of reminders) {
    const dueCopy = bill.reminderDay === 0 ? "due today" : `due in ${bill.reminderDay} days`;
    // reminder_email may hold several recipients ("a@x.com, b@y.com").
    const recipients = bill.reminder_email.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
    const result = await resend.emails.send({
      from: process.env.REMINDER_FROM_EMAIL ?? "BudgetTracker <reminders@budgettracker.app>",
      to: recipients,
      subject: `${bill.name} is ${dueCopy}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1d2924">
        <div style="background:#101712;border-radius:14px;padding:20px;text-align:center;margin-bottom:20px">
          <img src="${base}/brand-logo.png" alt="Budget Tracker" width="190" style="display:inline-block;width:190px;max-width:70%;height:auto" />
        </div>
        <h1 style="font-size:24px">Bill reminder</h1>
        <p><strong>${escapeHtml(bill.name)}</strong> is ${dueCopy}.</p>
        <p style="font-size:32px;font-weight:700;margin:24px 0">${formatCurrency(bill.amount)}</p>
        <p>Due date: ${escapeHtml(bill.dueDate)}</p>
        <p style="color:#6a746f">Open BudgetTracker to review or mark this bill as paid.</p>
      </div>`,
    });
    if (!result.error) {
      await recordReminder(bill.id, bill.reminderDay, bill.reminder_email);
      sent.push(bill.id);
    }
  }
  return NextResponse.json({ sent: sent.length, billIds: sent });
}
