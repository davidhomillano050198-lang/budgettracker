# Budget Tracker — Go-to-Market Launch Kit

_Prepared Oct 2026 · Live at https://budgettracker-five-zeta.vercel.app_

---

## 1. The honest starting point

| What we have | What's missing (and costs us conversions) |
|---|---|
| A polished, mobile-first app that works in the browser | No custom domain. A `vercel.app` link reads as a side project and hurts trust and SEO |
| A clear niche: **couples & families budgeting together** | Zero social proof: no testimonials, user count, or reviews |
| Free-forever plan, no credit card | Premium priced in **USD ($4)** for a Filipino audience, and still "coming soon" |
| Bill reminders by email, envelope budgets, savings vault, split by person | No referral or invite loop (yet the product *needs* a partner to join) |
| SEO basics are in place: metadata, OG image, sitemap, Search Console, a blog with 3 posts | Blog posts aren't localized (no ₱, sahod, 13th-month angle) |
| Vercel Analytics installed | No signup-funnel tracking, so we can't see where people drop off |

**Fix these four first, before spending a single peso on ads:**
1. **Buy a domain**, e.g. `budgettracker.ph` or a brandable `.app`, and point Vercel to it.
2. **Show peso pricing**: Premium at **₱149–₱199/month** (with an annual option of about ₱1,490/year).
3. **Add a "Invite your partner" moment** right after onboarding. Each household that brings a partner is a second user at no acquisition cost.
4. **Collect 5–10 real testimonials** from beta couples (see §6) and put them on the landing page.

---

## 2. Positioning

**Category:** Shared household budgeting app
**For:** Filipino couples and young families (25–40) who share expenses but argue about money, or simply don't know where it goes.
**Unlike** spreadsheets, notebook "lista," or solo apps built for one person,
**Budget Tracker** gives both partners **one private household**: you see whose money is whose *and* the full picture, and you never miss a bill.

**One-liner:** _Budgeting for two, without the fights._
**Taglish version:** _Isang budget para sa inyong dalawa, walang away sa pera._

### Message pillars
1. **Together, not tracked.** Shared visibility without surveillance; filter to "just me" anytime.
2. **Never miss a bill.** Meralco, Maynilad, internet, rent, and loans, with email reminders before they're due.
3. **Know what's safe to spend.** A daily "safe to spend" number, so payday (kinsenas/katapusan) doesn't vanish by day 5.
4. **Free and private.** Free forever, no credit card, data never sold.

### Ideal customer profiles
| Persona | Pain | Hook |
|---|---|---|
| **Newlyweds / live-in couples** (25–32) | "Saan napunta ang sahod?" Arguments over spending | "Budget as a team" |
| **Young parents** (28–40) | Tuition, milk, diapers, and bills pile up | "Never miss a bill again" |
| **OFW families** | Money sent home, no visibility on how it's spent | "See where every padala goes, together" |
| **Engaged couples saving for a wedding** | One shared goal, two incomes | Savings vault + goal ring |

---

## 3. 30-day launch plan

**Week 0 (prep, 3–5 days)**
- [ ] Custom domain live; update `metadataBase` in `src/app/layout.tsx`
- [ ] Peso pricing on landing page; add a "Join Premium waitlist" CTA
- [ ] Create brand accounts: Facebook Page, Instagram, TikTok, X, Threads (handle: `@budgettrackerph` or similar)
- [ ] Recruit 10–20 beta couples from friends/family; ask each for feedback and a testimonial

**Week 1: Soft launch (warm network)**
- Personal FB/IG post from the founder (story-driven: why you built it)
- Message 50 friends personally (template in §5.6). Personal DMs convert roughly 10× better than broadcasts
- Post 1 TikTok/Reel per day (scripts in §5.3)

**Week 2: Community**
- Value-first posts in Filipino personal-finance communities (r/phinvest, PH personal-finance and mommy/couples Facebook groups). **Read each group's rules first. Give advice, and mention the app only where self-promo is allowed.**
- Publish 2 localized blog posts (see §7)

**Week 3: Launch moment**
- Product Hunt launch (Tuesday–Thursday, 12:01am PT = 3:01pm PH time)
- "Payday challenge" campaign around the 15th/30th: _"Track every peso from kinsenas to katapusan."_

**Week 4: Amplify what works**
- Double down on the top 2 channels by signups and kill the rest
- Small paid test: ₱300/day Meta ads for 7 days on the best-performing Reel (targeting: PH, 25–40, engaged/married/parents)
- Reach out to 10 micro-influencers (5k–50k followers) in PH personal finance/mom content; offer free lifetime Premium and an affiliate code

---

## 4. Targets & tracking

| Metric | 30-day goal |
|---|---|
| Landing page visitors | 3,000 |
| Signups (visitor → signup) | 300 (10%) |
| Activated households (onboarding done + 5 transactions) | 150 (50%) |
| Households with a partner invited | 45 (30% of activated) |
| Premium waitlist emails | 100 |
| Testimonials collected | 10 |

**Track:** add Vercel Analytics custom events for `signup`, `onboarding_complete`, `first_transaction`, `partner_invited`. Use UTM links on every post (`?utm_source=tiktok&utm_campaign=launch`).

---

## 5. Ready-to-post copy

> Replace `[LINK]` with the live URL plus UTM tags. All claims below are true of the current product. **Don't add user counts or reviews until they're real.**

### 5.1 Founder launch post (Facebook / LinkedIn)
> After one too many "saan napunta yung pera natin?" conversations, I built something.
>
> **Budget Tracker** is a free budgeting app made for couples and families. You and your partner share one private household:
> ✅ Log income and expenses in seconds
> ✅ Set monthly budgets per category (food, bills, gas…)
> ✅ Get email reminders before bills are due. Wala nang late fees.
> ✅ See whose spending is whose, or the full picture
> ✅ Track your savings goal together
>
> It works on your phone's browser, no download needed. Free forever, no credit card.
>
> I'd love for you to try it with your partner and tell me honestly what's missing 🙏
> 👉 [LINK]

### 5.2 Instagram / Facebook carousel: "5 money fights couples have (and how to stop them)"
1. **Cover:** 5 money fights every couple has 💸 (#3 is the worst)
2. "Ikaw na naman gumastos?" → Fix: see spending *by person*, no blaming
3. "Nakalimutan mo bayaran yung Meralco?!" → Fix: automatic bill reminders
4. "Wala na tayong pera, kinsenas pa lang?" → Fix: a daily *safe-to-spend* number
5. "Kailan pa tayo makakaipon?" → Fix: a shared savings goal you both see
6. **CTA:** Budget Tracker: budgeting for two. Free forever. Link in bio.

**Caption:** Money is one of the top reasons couples fight. The fix isn't earning more, it's seeing the same numbers. Try Budget Tracker free with your partner 💚 #budgetingtips #ipon #couplegoals #personalfinanceph #moneytips

### 5.3 TikTok / Reels scripts (15–30s, face to camera or screen recording)

**A. "Payday reality check"**
- 0–3s hook (text on screen): _"Kinsenas ngayon. Ubos na by Monday?"_
- 3–15s: screen-record logging 3 expenses in the app; show the "safe to spend per day" number
- 15–25s: "Ito yung number na tinitingnan namin ng partner ko bago gumastos."
- CTA: "Free sya, link sa bio."

**B. "POV: you and your partner finally agree on money"**
- Duet-style skit: partner A buys milk tea, partner B's phone shows the category bar turning orange. Both laugh.
- Text: _"Ang envelope budgeting pero digital 😂"_

**C. "Bills I almost forgot this month"**
- Show the bills screen: rent, internet, Meralco, Netflix.
- "Ngayon may email reminder na ako 7, 3, at 1 day before. Zero late fees this month."

**D. "₱20,000 sahod, 50/30/20 rule, live"**
- Walk through setting a ₱20k monthly budget: ₱10k needs, ₱6k wants, ₱4k savings. Link to the blog post.

### 5.4 Reddit (r/phinvest or similar). Value first, follow sub rules
**Title:** How my partner and I stopped fighting about money (simple system that worked for us)
> Not an expert, just sharing what worked:
> 1. **One shared view.** We both log everything in one place. No more "I didn't know you bought that."
> 2. **Budget per category, per month.** Food ₱8k, transport ₱3k, etc. When it's orange, we slow down.
> 3. **Bills on autopilot reminders.** We list every recurring bill with its due date and get reminded days before.
> 4. **Separate savings bucket** with a goal we can both see grow.
>
> You can do this in a shared Google Sheet. We ended up building a free app for it (Budget Tracker) because the sheet got messy on mobile. Happy to share if mods allow, but the system matters more than the tool.

### 5.5 Product Hunt
- **Tagline (60 chars):** Budgeting for couples & families — without the fights
- **Description:** Budget Tracker gives you and your partner one private household to track income, plan envelope budgets, split spending by person, save toward a shared goal, and get reminded before bills are due. Mobile-first, works in any browser, free forever.
- **First comment:** Founder story (why) + what's coming in Premium + ask for feedback.

### 5.6 Personal DM template (warm network)
> Hi [Name]! Gumawa ako ng budgeting app para sa couples, kasi kami ng partner ko laging nagkakagulo sa gastos 😅 Free sya. Pwede mo bang i-try with [partner] for a week and tell me honestly kung ano kulang? Malaking tulong 🙏 [LINK]

### 5.7 Testimonial request (send after 7 days of use)
> Thanks for trying Budget Tracker! Quick favor: in 1–2 sentences, what changed for you two since you started? Pwede ko bang gamitin sa website namin (first name + city lang)?

---

## 6. Retention & referral (marketing inside the product)

These need small product changes, which I can build:
- **Partner invite** right after onboarding: "Budgeting works better together. Invite [partner name]."
- **Weekly email recap:** "This week you spent ₱X, ₱Y left in your Food budget." This brings people back and gets forwarded.
- **Payday nudge** on the 15th/30th: "Payday! Set this kinsenas' plan in 2 minutes."
- **Share card:** "We saved ₱10,000 together 🎉" image for IG stories, with the app's link on it.

---

## 7. SEO content calendar (localized, high intent)

| # | Article | Target search |
|---|---|---|
| 1 | How to Budget Your Sahod: Kinsenas & Katapusan Method | budget sahod, how to budget salary philippines |
| 2 | Where to Put Your 13th Month Pay (A Couple's Guide) | 13th month pay tips |
| 3 | Budget Plan for Newlyweds in the Philippines | budget for newly married couple philippines |
| 4 | OFW Family Budget: Tracking Padala Together | ofw budget plan, padala budgeting |
| 5 | Monthly Household Bills Checklist (Meralco, Water, Internet) | monthly bills philippines |
| 6 | ₱20k / ₱30k / ₱50k Salary Budget Examples | budget plan 20k salary |
| 7 | Envelope Budgeting, Explained (Digital Version) | envelope budgeting app |

Each article should end with a soft CTA: _"Track this plan with your partner, free →"_.

---

## 8. Budget options

| Tier | Monthly spend | Mix |
|---|---|---|
| **Bootstrap** | ₱0 | Organic content, communities, warm network, SEO |
| **Starter** | ₱10,000 | Above + Meta ads tests (₱300/day) + 2 micro-influencers (free Premium/affiliate) |
| **Growth** | ₱30,000+ | Above + 5–8 influencers, retargeting ads, a payday-week campaign |

Start at **Bootstrap**. Don't pay for traffic until visitor-to-signup conversion is above 8%. Otherwise you're paying to fill a leaky bucket.
