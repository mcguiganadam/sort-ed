"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { SortedTask, listOpenTasks, exportAllData, clearAllData } from "@/lib/db";
import TaskCapture from "@/components/TaskCapture";
import SortedList from "@/components/SortedList";
import AutoDetectPanel from "@/components/AutoDetectPanel";
import TodaySchedule from "@/components/TodaySchedule";
import Link from "next/link";
import KofiButton from "@/components/KofiButton";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import SlackComingSoon from "@/components/SlackComingSoon";

function Mark() {
  // Same tick-in-a-squircle as app/icon.svg, inlined so it renders crisp
  // at header size rather than loading the favicon file separately.
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="9" fill="#3f5f8a" />
      <path
        d="M9 17l5 5 9-11.5"
        stroke="#faf7f2"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<SortedTask[]>([]);

  const refresh = useCallback(async () => {
    setTasks(await listOpenTasks());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleExport() {
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sorted-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleClear() {
    if (!confirm("Delete everything sorted on this device? This can't be undone.")) return;
    await clearAllData();
    refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mark />
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight text-sorted-primary-dark">
              SortEd
            </h1>
            <p className="text-sm text-sorted-ink-soft">Teaching comes first.</p>
          </div>
        </div>
        <KofiButton />
      </header>

      {/* Adam: "I want to use that space to explain the purpose of SortEd" —
          the pitch a cold visitor (Reddit, a shared link) needs before
          deciding whether to sign in at all. Adam's own wording, verbatim —
          two short beats (what piles up / what it's for) then the payoff.
          This is a first pass, not the full landing/first-impression
          treatment still on the checklist — that pass should revisit this
          copy too, not just add around it.
          No max-w here (Adam: "balance is off") — capping this block at
          max-w-2xl while the header above it (SortEd + the Ko-fi button)
          and every card below it run the container's full width left a
          lopsided gap on the right, under the Ko-fi button, that nothing
          else on the page has. Letting it wrap at the same full width as
          everything else lines its right edge up with the rest of the
          page instead of stopping short. */}
      <div className="mt-3 space-y-1 text-base text-sorted-ink-soft">
        <p>
          For all the messages and admin stuff that piles up and overwhelms. For the thoughts
          that you don&rsquo;t want to lose.
        </p>
        <p>Capture and sort them for later, so you can focus on teaching.</p>
      </div>

      {/* "How it works" 3-step strip (Capture/Sort/Handle it later) hidden
          for now, Aug 30 -- Adam wants to revisit the wording before it
          goes back in. Not deleted from history: see commit 2bf68fe. */}

      {/* rounded-full works as a single-line status pill on desktop, but at
          phone width this row's content (sign-in buttons, or "Signed in
          as..." + Sign out) wraps onto two lines — inside a stadium-radius
          container that produces a lopsided blob with dead space in the
          rounded corners rather than a clean shape. rounded-2xl reads fine
          whether the content is one line or two; only sm: and up (where it
          reliably fits on one line) restores the pill look. */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl bg-sorted-primary-soft/60 px-4 py-3 text-sm sm:gap-3 sm:rounded-full sm:py-2">
        {status === "authenticated" ? (
          <>
            <span className="text-sorted-ink-soft">Signed in as {session?.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="font-medium text-sorted-primary-dark underline decoration-dotted underline-offset-2 hover:text-sorted-primary"
            >
              Sign out
            </button>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <GoogleSignInButton />
            <SlackComingSoon />
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-5">
        <TaskCapture onSorted={refresh} />
        <TodaySchedule />
        <AutoDetectPanel onSorted={refresh} />
        <SortedList tasks={tasks} onChanged={refresh} />
      </div>

      {/* Moved down from under the header (Adam wanted that space for the
          purpose line above instead) — still reads fine here, right under
          the sort boxes it's actually describing. Adam: "we need to
          somehow warn users that closing tabs, browsers etc mean data is
          lost (or we fix that somehow)." Tested this directly first rather
          than guessing: added a task, fully closed and reopened the
          browser against the same sort-ed.org origin — it was still
          there, because IndexedDB isn't tied to a tab or even a browser
          window, only to this browser's storage for this site. The two
          ways it genuinely doesn't survive (confirmed with Adam as what
          he'd actually seen) are a private/incognito window, which most
          browsers wipe on close by design, and switching to a different
          browser or device, since there's no server to sync from. Framed
          as reassurance rather than a warning, per this project's "reduce
          stress, don't invoke it" copy principle
          (sorted-handoff-20260828.md) — "nothing is lost" is the
          differentiated pitch here, not a caveat to bury. */}
      <p className="mt-6 text-sm text-sorted-ink-soft">
        Saved right here on this device. Closing and reopening this tab keeps everything. A
        private/incognito window, a different browser, or device starts fresh.
      </p>

      <footer className="mt-12 border-t border-sorted-border pt-6 text-xs text-sorted-ink-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md">
            Everything above stays private — nothing is stored on a server, ever.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:sorted.help@proton.me"
              className="underline decoration-dotted underline-offset-2 hover:text-sorted-ink"
            >
              Contact
            </a>
            {/* Was just an inline claim ("nothing is stored on a server, ever")
                with nothing to click through to. Now links to a real policy
                page (app/privacy/page.tsx) — both because teachers deserve
                more than a one-line promise, and because a linked, public
                privacy policy is a prerequisite for Google's OAuth
                verification on the Gmail/Calendar scopes. */}
            <Link href="/privacy" className="underline decoration-dotted underline-offset-2 hover:text-sorted-ink">
              Privacy Policy
            </Link>
            <button onClick={handleExport} className="underline decoration-dotted underline-offset-2 hover:text-sorted-ink">
              Export my data
            </button>
            <button onClick={handleClear} className="underline decoration-dotted underline-offset-2 hover:text-red-500">
              Delete everything
            </button>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-sorted-ink-soft/70">
          © {new Date().getFullYear()} SortEd.
        </p>
      </footer>
    </main>
  );
}
