const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

export type BillReminderEmail = {
  name: string;
  /** Pre-formatted amount, e.g. "₱2,800.00". */
  amount: string;
  /** Human due phrase, e.g. "due in 3 days" / "due today". */
  dueCopy: string;
  /** ISO date string, e.g. "2026-08-28". */
  dueDate: string;
  /** Recurrence label, e.g. "Monthly" (optional). */
  recurrence?: string;
  /** Public origin for the logo + CTA link. */
  base: string;
};

/**
 * Professional, email-client-safe (table + inline styles) bill reminder.
 * Renders a branded dark header with the hosted logo, a prominent amount
 * card, due details, and a call-to-action button.
 */
export function renderBillReminderEmail({ name, amount, dueCopy, dueDate, recurrence, base }: BillReminderEmail): string {
  const prettyDate = (() => {
    const d = new Date(`${dueDate}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? dueDate
      : d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  })();
  const safeName = escapeHtml(name);
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#eef1ec;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safeName} is ${dueCopy} — ${escapeHtml(amount)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1ec;padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px -18px rgba(11,42,29,.35);border:1px solid #e2e8e2;">
        <tr>
          <td style="background:#101712;background-image:linear-gradient(135deg,#0f1a13,#12241a);padding:30px 32px;text-align:center;">
            <img src="${base}/brand-logo.png" width="188" alt="Budget Tracker" style="display:inline-block;width:188px;max-width:66%;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:34px 36px 8px 36px;">
            <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:.10em;text-transform:uppercase;font-weight:700;color:#0b7a4c;">Upcoming bill</p>
            <h1 style="margin:0;font-size:23px;line-height:1.3;font-weight:700;color:#14201a;">${safeName} is ${dueCopy}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 6px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f8f4;border:1px solid #dcebe1;border-radius:14px;">
              <tr><td style="padding:22px 24px;">
                <p style="margin:0 0 4px 0;font-size:12px;color:#6a746f;font-weight:600;">Amount due</p>
                <p style="margin:0;font-size:34px;line-height:1;font-weight:800;color:#0b7a4c;letter-spacing:-.02em;">${escapeHtml(amount)}</p>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 36px 4px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#3b4741;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eef1ec;color:#6a746f;">Due date</td>
                <td style="padding:10px 0;border-bottom:1px solid #eef1ec;text-align:right;font-weight:600;color:#14201a;">${escapeHtml(prettyDate)}</td>
              </tr>
              ${recurrence ? `<tr>
                <td style="padding:10px 0;border-bottom:1px solid #eef1ec;color:#6a746f;">Repeats</td>
                <td style="padding:10px 0;border-bottom:1px solid #eef1ec;text-align:right;font-weight:600;color:#14201a;">${escapeHtml(recurrence)}</td>
              </tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 34px 36px;">
            <a href="${base}" style="display:block;background:#12a266;color:#ffffff;text-decoration:none;text-align:center;font-size:15px;font-weight:700;padding:15px 24px;border-radius:11px;">Review or mark as paid</a>
            <p style="margin:16px 0 0 0;font-size:12px;color:#8a938d;text-align:center;">Open BudgetTracker to review this bill, mark it paid, or adjust the reminder.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f7f9f6;padding:20px 36px;border-top:1px solid #e7ebe6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#98a29b;line-height:1.6;">You're receiving this because bill reminders are on for your household.<br/>BudgetTracker · Private household finance</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
