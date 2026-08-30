import type { Metadata } from "next";
import Link from "next/link";

// app/privacy/page.tsx
//
// SortEd's actual privacy policy — previously just a one-line footer claim
// ("nothing is stored on a server, ever"), which is true but isn't a real
// policy. This page exists for two reasons at once: it's the honest,
// public-facing explanation teachers deserve before connecting Gmail/
// Calendar/Slack, and it's a prerequisite Google's OAuth verification
// requires (a linked, public privacy policy is step one of both the
// sensitive-scope and restricted-scope verification flows for
// calendar.readonly and gmail.readonly).
//
// Every claim below is checked against the actual code, not written to
// sound reassuring and then hoped true — see lib/auth.ts, lib/db.ts, and
// app/api/*/scan/route.ts for the implementation each paragraph describes.
// This is still not a substitute for a real legal review (see README
// "License / status") — it's an accurate plain-language description of
// what the app does, not a compliance certification.

export const metadata: Metadata = {
  title: "Privacy Policy — SortEd",
  description: "What SortEd accesses, what it stores, and what it never does.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-sorted-primary-dark">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-sorted-ink">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link
        href="/"
        className="text-sm font-medium text-sorted-primary-dark underline decoration-dotted underline-offset-2 hover:text-sorted-primary"
      >
        ← Back to SortEd
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-sorted-primary-dark">Privacy Policy</h1>
      <p className="mt-2 text-sm text-sorted-ink-soft">
        Last updated August 30, 2026. Questions?{" "}
        <a href="mailto:sorted.help@proton.me" className="underline decoration-dotted underline-offset-2 hover:text-sorted-ink">
          sorted.help@proton.me
        </a>
        .
      </p>

      <p className="mt-6 text-sm leading-relaxed text-sorted-ink">
        SortEd is a quick-capture tool for teachers, built around one rule: nothing you sort is ever stored anywhere but
        your own browser. This page explains exactly what that means — what SortEd looks at, what it keeps, and what it
        never does — in plain language, checked against the actual code rather than written to sound reassuring.
      </p>

      <Section title="What SortEd stores">
        <p>
          Every task you sort — the note, the category, the urgency, whether it&rsquo;s done — is written to your
          browser&rsquo;s own local database (IndexedDB) and never sent anywhere else. There is no SortEd server-side
          database, no user table, no backup copy. If SortEd&rsquo;s servers disappeared tomorrow, nothing you&rsquo;ve
          sorted would be lost or exposed, because it was never there in the first place.
        </p>
        <p>
          This also means SortEd has no cross-device sync: what you sort on one browser, on one device, stays on that
          browser, on that device. Clearing your browser&rsquo;s site data for sort-ed.org, or using a private/incognito
          window that wipes storage on close, clears it too.
        </p>
      </Section>

      <Section title="What SortEd reads, if you connect it">
        <p>Connecting Google or Slack is optional — Quick Capture works fully without either. If you do connect them:</p>
        <p>
          <strong>Gmail (read-only).</strong> When you open the Messages panel and scan, SortEd asks Gmail for your
          15 most recent inbox messages from the last two days — just the sender, subject line, and Gmail&rsquo;s own
          short preview snippet, never the full message body. That's read fresh for that one request, used to guess
          whether a message looks sortable, shown to you in the feed, and then forgotten — nothing is written to a
          database or a log. SortEd cannot send, delete, or modify anything in your Gmail.
        </p>
        <p>
          <strong>Google Calendar (read-only).</strong> Today&rsquo;s Schedule asks Calendar for events between your
          browser&rsquo;s local midnight and the next one, restricted to just the event time and title — no
          description, no attendee list, no location. SortEd cannot create, edit, or delete calendar events.
        </p>
        <p>
          <strong>Slack (read-only, coming soon).</strong> Once available, scanning Slack reads recent history from
          your own channels and DMs using your own user-level access — the same messages you could already see —
          never a bot with separate access, and never anything you can&rsquo;t already read yourself. SortEd cannot
          post, edit, or delete anything in Slack.
        </p>
        <p>
          None of this is summarized or processed by an external AI service — the "who / what" line you see in the
          feed is built with a plain, local keyword heuristic. Your email and Slack content never leaves SortEd&rsquo;s
          own one-off request to Google or Slack and back to your browser.
        </p>
      </Section>

      <Section title="How sign-in works">
        <p>
          Signing in with Google or Slack uses standard OAuth — SortEd never sees or stores your password. What it
          receives is a limited-scope access token, which is encrypted and signed into a cookie in your own browser
          (NextAuth&rsquo;s JWT session). There is no server-side session store: the token lives only in that cookie,
          and only your browser holds it.
        </p>
        <p>
          One consequence worth knowing: signing out of SortEd clears that cookie, but it doesn&rsquo;t revoke the
          underlying Google or Slack authorization on its own — Google and Slack keep a separate record that you
          granted SortEd access, the same as any other app you&rsquo;ve signed into with your Google account. To fully
          revoke it, visit{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-sorted-ink"
          >
            myaccount.google.com/permissions
          </a>{" "}
          and/or your Slack workspace&rsquo;s "Apps" settings and remove SortEd there.
        </p>
      </Section>

      <Section title="About student and behaviour data">
        <p>
          SortEd is built for teachers, not students — there&rsquo;s no student-facing sign-in, and SortEd never
          connects to a student information system or gradebook. If you choose to type a behaviour note, a parent
          contact summary, or similar into Quick Capture, that text is treated exactly like any other sorted task: it
          stays in your own browser&rsquo;s local storage, never sent to a SortEd server.
        </p>
        <p>
          That said, behaviour and assessment notes are still student records under most schools&rsquo; own data
          policies, regardless of where they&rsquo;re technically stored. Please follow your school&rsquo;s guidance on
          what belongs in a tool like this — initials rather than full names are a sensible default, and this policy
          isn&rsquo;t a substitute for your school&rsquo;s own data-handling rules or a legal opinion on them.
        </p>
      </Section>

      <Section title="What SortEd never does">
        <p>
          No ads, no ad tracking, no selling or sharing your data with third parties, no third-party analytics
          watching what you sort, and no write access to your Gmail, Calendar, or Slack — everything above is
          read-only by design, enforced by the OAuth scopes SortEd requests, not just a promise.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          The "Support SortEd on Ko-fi" button is a plain link to Ko-fi&rsquo;s own donation page. SortEd itself never
          handles, sees, or stores any payment or card information — Ko-fi does, under its own privacy policy.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If what SortEd accesses or stores changes, this page will be updated and the "Last updated" date above will
          change with it. Significant changes will also be noted in the app itself.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, concerns, or a request to understand your data (there won&rsquo;t be much to find, since it&rsquo;s
          on your device, not SortEd&rsquo;s servers) — email{" "}
          <a href="mailto:sorted.help@proton.me" className="underline decoration-dotted underline-offset-2 hover:text-sorted-ink">
            sorted.help@proton.me
          </a>
          .
        </p>
      </Section>
    </main>
  );
}
