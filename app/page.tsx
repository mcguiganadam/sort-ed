"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { SortedTask, listOpenTasks, exportAllData, clearAllData } from "@/lib/db";
import TaskCapture from "@/components/TaskCapture";
import SortedList from "@/components/SortedList";
import AutoDetectPanel from "@/components/AutoDetectPanel";
import TodaySchedule from "@/components/TodaySchedule";
import Link from "next/link";
import KofiButton from "@/components/KofiButton";

// Modernist first-run redesign (design handoff, 2026-08-30: "Teacher-
// Friendly First-Run Experience"), direction 1a. Flat/architectural: zero
// border-radius anywhere below, 2px divider rules (border-flat-divider)
// as the only section separators instead of card shadows. See
// tailwind.config.js's `flat.*` tokens and `fontFamily.modernist` for the
// full token set, and the project doc
// claude/sorted-design-handoff-20260830-teacher-dashboard.md for the
// complete spec this was built from.
//
// Worth flagging to Adam: the handoff's README "Design Tokens" section
// lists all 9 category colors for this direction, but the interactive
// prototype itself (SortEd Redesign.dc.html / TaskRowModernist.dc.html --
// the part described as "high-fidelity... final for direction 1a")
// renders every category tag monochrome throughout -- outline when
// unselected/persistent, filled-dark when selected -- reserving color
// entirely for urgency (red/orange/blue). That's what's implemented here,
// since it's the more concrete, clickable spec of the two, but it does
// mean the 9-color CATEGORY_STYLES palette (lib/templates.ts) -- including
// the hue-distance work from the last polish pass, see
// sorted-design-polish-log-20260830.md -- is now unused by this page. It's
// left in place, not deleted, in case that's the wrong call.

function FlatMark() {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center bg-flat-accent"
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 32 32">
        <path
          d="M9 17l5 5 9-11.5"
          stroke="#f3f2f2"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
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
    <main className="mx-auto max-w-6xl bg-flat-bg font-modernist text-flat-text">
      {/* Nav: mark + wordmark only -- no tagline (it's now the hero h1
          itself). Ko-fi link lives at the bottom-right of the hero box
          below (Adam: remove the standalone "signed in / the dashboard"
          bar, move Support SortEd up into the hero). */}
      <div className="flex items-center gap-3 px-6 py-6 sm:px-12 lg:px-20 xl:px-24">
        <FlatMark />
        <span className="text-base font-bold uppercase tracking-wide">SortEd</span>
      </div>

      {/* Hero */}
      <div className="border-b-2 border-flat-divider px-6 pt-4 pb-6 sm:px-12 sm:pt-6 sm:pb-8 lg:px-20 lg:pt-8 lg:pb-10 xl:px-24">
        <h1 className="font-modernist text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-[56px]">
          Teaching comes first.
        </h1>
        <div className="mt-6 text-base opacity-80 sm:text-lg">
          <p>
            For all the messages and admin stuff that piles up. For the thoughts that you
            don&rsquo;t want to lose.
            <br className="hidden sm:inline" /> Sort them for later, so you can focus on teaching
            now.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {status === "authenticated" ? (
            <>
              <span className="text-sm opacity-80">Signed in as {session?.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="text-sm font-semibold text-flat-accent-700 underline decoration-dotted underline-offset-2 hover:opacity-70"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {/* Flat, plain-text primary button per the handoff spec --
                  not GoogleSignInButton's official multicolor "G" mark
                  button used elsewhere on this page (the Messages card's
                  own connect prompt still uses that one). Calls the same
                  signIn("google") next-auth flow either way. Worth
                  flagging to Adam: Google's sign-in branding guidelines
                  are a real consideration for the in-flight OAuth
                  verification, so this trades brand-guideline compliance
                  here for visual consistency with the approved design. */}
              <button
                onClick={() => signIn("google")}
                className="bg-flat-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-flat-accent-700"
              >
                Sign in with Google
              </button>
              <span
                className="border border-dashed border-flat-divider px-3.5 py-2 text-sm opacity-45"
                style={{ cursor: "not-allowed" }}
                title="Not available yet"
              >
                Slack — coming soon
              </span>
            </>
          )}
          <div className="ml-auto">
            <KofiButton />
          </div>
        </div>
      </div>

      {/* min-w-0 on every direct child of the grid cells below, same fix
          as the mobile card-overflow bug (see git history, commit
          bc98917) -- a flex-wrap row inside any cell (Quick Capture's
          category pills) can still force a grid track wide if its
          wrapper isn't allowed to shrink. */}
      <div className="grid grid-cols-1 md:grid-cols-2 [&>*]:min-w-0">
        <div className="border-b-2 border-flat-divider p-6 sm:p-8 lg:p-12 md:border-r-2">
          <TaskCapture onSorted={refresh} />
        </div>
        <div className="border-b-2 border-flat-divider p-6 sm:p-8 lg:p-12">
          <TodaySchedule />
        </div>
        <div className="p-6 sm:p-8 lg:p-12 md:col-span-2">
          <AutoDetectPanel onSorted={refresh} />
        </div>
      </div>

      <div className="border-t-2 border-flat-divider flex flex-col gap-4 px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <h2 className="text-sm font-bold uppercase tracking-wide">Sorted</h2>
        <SortedList tasks={tasks} onChanged={refresh} />
        <p className="text-sm opacity-60">
          Saved right here on this device. Closing and reopening this tab keeps everything. A
          private/incognito window, a different browser, or device starts fresh.
        </p>
      </div>

      <footer className="border-t-2 border-flat-divider px-6 py-5 text-xs opacity-60 sm:px-12 lg:px-20 xl:px-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md">
            Everything above stays private — nothing is stored on a server, ever.
          </p>
          <div className="flex flex-wrap gap-5">
            <a href="mailto:sorted.help@proton.me" className="hover:opacity-100">
              Contact
            </a>
            <Link href="/privacy" className="hover:opacity-100">
              Privacy Policy
            </Link>
            <button onClick={handleExport} className="hover:opacity-100">
              Export my data
            </button>
            <button onClick={handleClear} className="text-flat-urgent hover:opacity-70">
              Delete everything
            </button>
          </div>
        </div>
        <p className="mt-4 text-[11px] opacity-70">© {new Date().getFullYear()} SortEd.</p>
      </footer>
    </main>
  );
}
