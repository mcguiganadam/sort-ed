# SortEd

Consider it sorted.

A quick-capture tool that protects teachers' planning time by moving
admin work (behaviour notes, parent replies, leader updates, meeting prep,
assessment entry) into a scheduled batch window instead of letting it
interrupt the block.

Formerly "Park It" during early planning — renamed to SortEd (a "sorted" /
"Ed[ucation]" pun) partway through the build. It reads as supportive
("consider it sorted") rather than punitive, and it can't be mistaken for
a parking app. Code, file names, and internal identifiers below all use
the new name; `PARKITSUMMARY.md` (the original planning doc) still uses
the old one, which is fine — it's a record of that point in time.

This build is a specific variant of the original plan:

- **No database, ever.** Sorted tasks live only in the teacher's browser
  (IndexedDB). There is no backend user table, no cloud sync, no Supabase.
- **Reads Gmail, Google Calendar, and Slack** (read-only) to auto-detect
  sortable tasks, suggest a real batch window from the teacher's actual
  calendar, and help draft replies.
- **Ko-fi donations only.** No subscriptions, no Stripe, no feature gate.
  Every feature is free for every teacher; a Ko-fi button is a visible,
  optional way to say thanks.

If you're picking this up after the earlier `PARKITSUMMARY.md`: the
freemium/Supabase/Stripe plan in that doc has been superseded by this
approach for the pivot to a donation-supported, storage-free tool. The
core UX (capture → batch → template) is unchanged.

## Why "no data stored" is real, not just a privacy policy line

Behaviour notes and assessment data are student records (FERPA-adjacent in
most jurisdictions). The cheapest way to make a promise like "we never see
your students' data" actually true is to not build the pipe that could
carry it:

- Sorted tasks, templates, and logs are written to **IndexedDB in the
  browser** (`lib/db.ts`) and never sent anywhere.
- Gmail/Calendar/Slack are read **live, per-request**, by serverless
  functions that use the session's access token for that one call and then
  return — nothing is cached, logged, or written to disk.
- Auth uses NextAuth's **JWT session strategy**: your Google/Slack access
  tokens live inside an encrypted, signed, httpOnly cookie in your own
  browser. There's no `users` table, no `accounts` table, no database at
  all. See the comment block at the top of `lib/auth.ts`.
- Scopes requested are **read-only**: `gmail.readonly`,
  `calendar.readonly`, and Slack's `*:history`/`*:read` scopes. SortEd
  cannot send email, create calendar events, or post to Slack.
- "Draft reply" opens a `mailto:` link pre-filled from context held only in
  that browser tab's memory (`lib/mailto.ts`) — you review and hit send
  yourself, in your own mail client.

One consequence worth knowing: because there's no server-side session
store, signing out of SortEd doesn't revoke the underlying Google/Slack
grant. If a teacher wants to fully cut access, point them to
`myaccount.google.com/permissions` and Slack's "Apps" settings — the app
footer and sign-in flow should say this plainly.

**Before launch:** get a real privacy policy written and — per the original
plan — a short consult with an education-data privacy lawyer to confirm
this "we never receive it" model satisfies your jurisdiction's rules
around behaviour/assessment data. This README is not legal advice.

## Tech stack

| Piece | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Serverless functions double as thin, stateless API proxies |
| Local storage | IndexedDB via `idb` | Free tier needs zero backend; survives refresh, stays on-device |
| Auth | NextAuth (JWT strategy, no adapter) | Tokens live in an encrypted cookie, never a database |
| Gmail / Calendar | Google OAuth, `gmail.readonly` + `calendar.readonly` | Read-only auto-detect + real batch-window suggestion |
| Slack | Custom NextAuth OAuth2 provider, user token, `*:history` scopes | Reads as the teacher, not a bot — same visibility they already have |
| Donations | Ko-fi link/button | No PCI scope, no webhook, no subscription logic to maintain |
| Hosting | Vercel | Serverless functions, zero-config HTTPS, free tier |

## Folder structure

```
sorted/
  app/
    page.tsx                     # main dashboard
    layout.tsx / providers.tsx   # NextAuth SessionProvider wrapper
    api/
      auth/[...nextauth]/        # NextAuth handler
      gmail/scan/                # proxy: recent inbox, heuristically flagged
      calendar/freebusy/         # proxy: free/busy for next 5 school days
      slack/scan/                # proxy: recent channel history, flagged
  components/
    TaskCapture.tsx               # Screen 1: quick capture
    AutoDetectPanel.tsx           # Gmail/Slack scan + sort/draft-reply
    BatchSuggestion.tsx           # Screen 2: a clear moment, found from the calendar
    SortedList.tsx                # Screen 3: structured tap-to-fill templates
    KofiButton.tsx
  lib/
    db.ts                         # IndexedDB — the only place tasks live
    templates.ts                  # default per-task-type templates
    heuristics.ts                 # keyword classifier for auto-detect
    mailto.ts                     # builds the draft-reply mailto: link
    auth.ts                       # NextAuth config, Google + Slack providers
```

## Setup

### 1. Install

```bash
npm install
cp .env.local.example .env.local
```

### 2. Google OAuth (Gmail + Calendar, read-only)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create
   a project (e.g. "sorted-dev").
2. **APIs & Services → Library**: enable **Gmail API** and **Google
   Calendar API**.
3. **APIs & Services → OAuth consent screen**: External, add your test
   Google account as a test user while unverified.
4. **APIs & Services → Credentials → Create Credentials → OAuth client
   ID** → Web application.
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
     (once the domain below is live, also add
     `https://sort-ed.org/api/auth/callback/google`)
5. Copy the Client ID / Client Secret into `.env.local` as
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

Google will show an "unverified app" warning until you submit for
verification (required once you request `gmail.readonly` at scale) — fine
for dev and a small pilot with test users added manually.

### 3. Slack OAuth (read-only history)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New
   App** → From scratch → name it "SortEd", pick your workspace (or a
   dev workspace).
2. **OAuth & Permissions**:
   - Redirect URL: `http://localhost:3000/api/auth/callback/slack`
   - Under **User Token Scopes** add: `channels:history`,
     `channels:read`, `groups:history`, `im:history`, `mpim:history`
   - (Leave Bot Token Scopes empty — SortEd doesn't use a bot.)
3. **Basic Information** → copy the **Client ID** / **Client Secret** into
   `.env.local` as `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`.
4. Install the app to your workspace to test.

### 4. NextAuth secret

```bash
openssl rand -base64 32
```

Paste the output into `NEXTAUTH_SECRET` in `.env.local`.

### 5. Ko-fi

No API key needed. Set `NEXT_PUBLIC_KOFI_USERNAME` to your Ko-fi username
(the part after `ko-fi.com/` in your page URL).

### 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Deploying to Vercel

1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Add the same environment variables from `.env.local` in **Settings →
   Environment Variables** (set `NEXTAUTH_URL` to `https://sort-ed.org`).
4. Add the production callback URLs to the Google and Slack app configs:
   - `https://sort-ed.org/api/auth/callback/google`
   - `https://sort-ed.org/api/auth/callback/slack`
5. Deploy. Every push to `main` redeploys automatically.

No database to provision — that step from the original plan is gone
entirely.

### Connecting sort-ed.org (bought on GoDaddy)

1. In the Vercel project → **Settings → Domains → Add**, enter
   `sort-ed.org`. Vercel will show you a DNS record to add (an A record
   pointing at Vercel's IP, or a CNAME — it'll tell you which).
2. In GoDaddy → **My Products → sort-ed.org → DNS → Manage DNS**, delete
   GoDaddy's default parked-page A record if one exists, and add exactly
   the record Vercel showed you.
3. Wait for DNS to propagate (usually minutes, sometimes a few hours),
   then `sort-ed.org` resolves straight to the live deployment over HTTPS
   — Vercel provisions the certificate automatically, no GoDaddy SSL add-on
   needed.
4. Once it resolves, add the two OAuth redirect URIs above in the Google
   Cloud Console and the Slack app's OAuth settings.

## What's intentionally not built yet

- **Reminders/notifications** for the suggested batch window (would need a
  background job or push permission — out of scope for a storage-free MVP).
- **Sending replies directly** (Gmail send/compose scope) — kept as
  `mailto:` deliberately, to avoid SortEd ever holding send access.
- **Cross-device sync** — a direct consequence of "no server storage."
  If teachers ask for this later, it's a deliberate trade-off to revisit,
  not an oversight (see `PARKITSUMMARY.md`'s "Critical Unknowns").
- **Custom templates per user** (from the original monetisation plan) —
  would currently need to live in IndexedDB too; straightforward to add,
  not built in this pass.

## License / status

Prototype. Not yet reviewed by an education-data privacy lawyer — do that
before any real pilot with real student-adjacent data, even initials-only.
