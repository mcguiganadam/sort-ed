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
          <h1 className="font-display text-2xl font-bold leading-tight text-sorted-primary-dark">
            SortEd
          </h1>
        </div>
        <KofiButton />
      </header>

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
