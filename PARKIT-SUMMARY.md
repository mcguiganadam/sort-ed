# Park It — Product Summary

## Problem

Teachers in international schools have 6–8 hours of protected planning time per week, but it's being suffocated by **unscheduled admin work** that arrives mid-block:

- Behaviour incident notes
- Assessment data entry
- Parent communication coordination
- Meeting prep and follow-ups
- Progress tracking
- Replies to colleagues, middle leaders, senior leaders

The interruptions aren't about email volume — they're about **cognitive context-switching**. A teacher sits down for 2 hours of UDL unit planning, and then:
- Needs to log a behaviour incident
- Has emails from three middle leaders needing progress updates
- Needs to prep for a parent meeting
- Gets pulled into a colleague question

Planning block fragments. By the time they refocus, half the time is gone.

## Solution: Park It

A **task capture and batching app** that protects planning time by moving admin work into scheduled windows.

### Core Flow

**Screen 1: Ten-second capture**
- Teacher encounters an admin task mid-planning-block
- Opens Park It, selects task type (Behaviour / Assessment / Parent / Leader Reply / Meeting Prep)
- Types one line (initials + brief context: "M.O. — lunchtime, playground")
- Taps "Park it"
- **Back to planning, unbroken**

**Screen 2: Batch window suggestion**
- App groups parked tasks by type
- Suggests optimal batch window ("Thursday 15:30–16:15, your lightest afternoon")
- Shows estimated time for all tasks (~35 minutes for 9 tasks)

**Screen 3: Structured template for each task type**
- No blank boxes — tap-to-fill fields only
- Behaviour log: incident type (conflict / refusal / language / property), action taken, follow-up needed
- Assessment: quick form structure
- Parent comm: templates for common scenarios
- Progress tracking: structured rubric
- All fields have pre-built options (tap, don't type)
- **Stored locally on device** (initials-only, no full student names synced to cloud)

### Why This Works

1. **The planning bar never breaks** — capture is deliberately impoverished (10 seconds max)
2. **Batching is faster than scattered** — five behaviour notes in a row beats five interruptions across the day
3. **Templates kill the blank box** — structured fields instead of free text means 90-second logs instead of 20-minute agonising
4. **On-device storage** — sensitive data (behaviour notes, assessment data) never leaves the teacher's device in free tier
5. **Real value proposition** — "I protected my planning time" not "I organized my email better"

## Target Market

**Individual teachers in international schools**
- Problem is self-driven (teachers can't switch off from admin)
- Not a school-culture issue — individual teachers drowning in obligations
- Validation interviews still pending, but timing is sharp: report-writing season (Feb) and new-year tool-shopping (summer 2027)

## Monetization Model

**Freemium, with cloud sync as the paid unlock**

### Free Tier
- 5 parked tasks per week
- All five task types (behaviour, assessment, parent, leader, meeting)
- Basic templates for each
- On-device storage only (IndexedDB in browser)
- Weekly time tracker
- **Cost to you: ~$0** (no backend needed for free users)

### Paid Tier ($4–5/month)
- Unlimited parked tasks
- Cloud sync across devices (Supabase backend)
- Custom templates (users can create their own)
- Weekly analytics and reports
- Export to CSV/PDF
- **Psychology:** cloud sync is the "$4/month feels worth it" feature without requiring it for core function

## Product Positioning

**Marketing hook:** "Don't do it now. Park it."

Planning time is sacred. You protected it. This app keeps it protected by moving admin work into the one place it belongs — a scheduled batch window, not a mid-planning interruption.

**Not selling:** email management, AI classification, smarter inbox
**Selling:** protected planning time, structured task batching, templates that save typing

## Tech Stack

- **Frontend:** Next.js (React)
- **Local storage (free users):** IndexedDB (browser-native, no sync)
- **Cloud storage (paid users):** Supabase PostgreSQL
- **Auth:** Firebase Auth or Supabase Auth (email login only)
- **Payments:** Stripe (subscription management)
- **Hosting:** Vercel (one-click deployment, free tier)
- **Deployment:** Vercel (push to GitHub → automatic deploy)

### Data Models (Simplified)

```
Users
  - id
  - email
  - subscription_status (free / paid)
  - created_at

Tasks (stored locally for free users, synced to Supabase for paid)
  - id
  - user_id
  - task_type (behaviour / assessment / parent / leader / meeting)
  - initial_capture (initials + one line)
  - full_log (complete form data)
  - completed_at
  - created_at

Templates (user-created or defaults)
  - id
  - user_id (or null for defaults)
  - task_type
  - template_name
  - template_fields (JSON)

Analytics (for paid users)
  - id
  - user_id
  - tasks_parked_this_week
  - tasks_completed_this_week
  - avg_time_per_batch
  - week_of
```

## Timeline

**Now (Nov 2026):** Architecture + planning
**Week of Dec 2–6:** Set up accounts (Supabase, Stripe, Vercel), write MVP code
**Dec 7–Jan 31:** Deploy, test with OYIS network (handful of teachers), refine
**Feb 2027:** Soft launch during reporting season (catch the pain)
**Summer 2027:** Full push (teacher communities, social media, "what's new for next year" buying season)

## Legal / Privacy Considerations

**Important:** Behaviour notes and assessment data are **student records** and subject to regulations (FERPA in US, equivalent in other jurisdictions).

### Design decisions to mitigate risk:
1. **Initials-only capture** — database never stores full student names
2. **On-device storage for free tier** — data never leaves the teacher's device
3. **Optional cloud sync for paid tier** — paid users *choose* to sync; free users get zero sync
4. **No automatic syncing of sensitive data** — teacher explicitly opts in to cloud features
5. **Privacy policy required before launch** — plain-language explanation of what data we store and where

**Next step before building:** consult an education-data privacy lawyer ($1–2k) to confirm this approach is sound. Not optional, just deferred until you're ready to deploy.

## Marketing Strategy (for Feb + Summer 2027)

### Channel 1: Teacher Communities
- Reddit r/Teachers
- Facebook groups (International School Teachers, Expat Teachers)
- LinkedIn (teacher/principal communities)
- TikTok (teacher creators talking about workload)

### Channel 2: Direct Outreach
- Your OYIS network (first users, testimonials)
- International school associations (newsletters, conferences)
- University education programs (preservice teachers)

### Channel 3: Content
- Blog: "Why protected planning time isn't working (and how to fix it)"
- Email sequence for waitlist: pain → solution → soft launch
- Case study: OYIS teachers' time before/after

### Early Metrics to Track
- Signups from each channel (CAC per channel)
- Free-to-paid conversion rate (target: 5–10%)
- Churn rate (how many quit in month 1, 3, 6)
- Task completion rate (are users actually batching?)
- NPS and qualitative feedback

## Your Next Steps (This Week)

### 1. Create Three Accounts
- **Supabase** (supabase.com) — database
  - Sign up, create a project called "parkit-dev"
  - Save: project URL, API key (anon key)
- **Stripe** (stripe.com) — payments
  - Sign up, go to API keys
  - Save: test API keys (publishable + secret)
  - Stay in test mode for now
- **Vercel** (vercel.com) — hosting
  - Sign up, connect GitHub
  - Don't deploy yet

### 2. Create GitHub Account (if you don't have one)
- github.com
- Needed for code storage + Vercel deployment

### 3. Save All API Keys
- Create a file called `.env.local` (we'll populate this together)
- Secure location, never commit to GitHub

### 4. Message Back
- Once accounts are set up, reply with confirmation
- I'll write the complete MVP code
- Then we walk through deployment step-by-step

## Code & Architecture (To Come)

Once you have accounts set up, I will provide:

1. **Complete Next.js codebase**
   - `/app` — page structure
   - `/components` — UI components (task capture, batch view, templates)
   - `/lib` — database queries, auth logic, Stripe integration
   - `/public` — assets
   - `.env.local` — environment variables (you fill in the API keys)
   - `package.json` — dependencies
   - Extensive comments explaining every key piece

2. **Database schema**
   - SQL migrations for Supabase
   - Indexes for performance

3. **Deployment guide**
   - Step-by-step Vercel setup
   - Environment variable config
   - Testing checklist

4. **Learning guide**
   - Explanation of key concepts (OAuth, databases, subscriptions)
   - How to add a new task type
   - How to debug common errors

## Success Metrics (Launch + First 6 Months)

- **Signups:** 100+ by end of Feb, 500+ by summer
- **Free-to-paid conversion:** 5–10%
- **Churn:** < 10% month-over-month
- **NPS:** > 40
- **Task completion rate:** > 70% of parked tasks actually completed in batch window
- **Teacher feedback:** "I actually had unbroken planning time this week"

## Critical Unknowns (Still to Validate)

1. **Do teachers actually batch admin work?** Or do they still interrupt themselves?
2. **Will on-device storage limit adoption?** (Some might want cross-device sync even if free)
3. **Which task type is most painful?** (Behaviour notes vs. assessment vs. parent comms?)
4. **What's the real time saved?** (Interview data pending)
5. **International school IT policies** — can teachers install apps freely, or does IT block things?

These will be answered by early users (Feb onward). Be ready to pivot if the data says otherwise.

---

## The Learning Path

You're learning to code by doing this project. Expect:

- **Weeks 1–2:** Account setup, reading the code, understanding structure
- **Week 3:** Deployment to Vercel (first "oh, it's live" moment)
- **Weeks 4–6:** Testing, finding bugs, fixing them with help
- **Week 7+:** Adding features, owning the product

This isn't easy. You'll hit errors you don't understand. **That's normal and good.** You're learning by building, not by watching tutorials.

By February, you won't be a full-stack engineer. But you'll understand your own product — what it does, how it works, how to maintain it.

That's worth the struggle.

---

## Questions Before We Code?

What's unclear? What needs more detail?

Once you have those three accounts set up and API keys saved, reply and we'll write the code.
