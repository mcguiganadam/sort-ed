"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { ParkedTask, listOpenTasks, exportAllData, clearAllData } from "@/lib/db";
import TaskCapture from "@/components/TaskCapture";
import ParkedList from "@/components/ParkedList";
import AutoDetectPanel from "@/components/AutoDetectPanel";
import BatchSuggestion from "@/components/BatchSuggestion";
import KofiButton from "@/components/KofiButton";

function Mark() {
  // Same tick-in-a-squircle as app/icon.svg, inlined so it renders crisp
  // at header size rather than loading the favicon file separately.
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="9" fill="#3f6b4f" />
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
  const [tasks, setTasks] = useState<ParkedTask[]>([]);

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
    if (!confirm("Delete everything parked on this device? This can't be undone.")) return;
    await clearAllData();
    refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mark />
          <h1 className="font-display text-2xl font-bold leading-tight text-sorted-leaf-dark">
            SortEd
          </h1>
        </div>
        <KofiButton />
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-full bg-sorted-leaf-soft/60 px-4 py-2 text-sm">
        {status === "authenticated" ? (
          <>
            <span className="text-sorted-ink-soft">Signed in as {session?.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="font-medium text-sorted-leaf-dark underline decoration-dotted underline-offset-2 hover:text-sorted-leaf"
            >
              Sign out
            </button>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => signIn("google")}
              className="rounded-full bg-white px-3 py-1 font-medium text-sorted-leaf-dark ring-1 ring-sorted-leaf/25 transition hover:bg-sorted-leaf hover:text-white hover:ring-sorted-leaf"
            >
              Connect Google
            </button>
            <button
              onClick={() => signIn("slack")}
              className="rounded-full bg-white px-3 py-1 font-medium text-sorted-leaf-dark ring-1 ring-sorted-leaf/25 transition hover:bg-sorted-leaf hover:text-white hover:ring-sorted-leaf"
            >
              Connect Slack
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-5">
        <TaskCapture onParked={refresh} />
        <BatchSuggestion openTasks={tasks} />
        <AutoDetectPanel onParked={refresh} />
        <ParkedList tasks={tasks} onChanged={refresh} />
      </div>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-sorted-border pt-6 text-xs text-sorted-ink-soft">
        <p className="max-w-md">
          Everything above lives only in this browser (IndexedDB). Nothing is uploaded to a SortEd
          server — ever.
        </p>
        <div className="flex gap-4">
          <button onClick={handleExport} className="underline decoration-dotted underline-offset-2 hover:text-sorted-ink">
            Export my data
          </button>
          <button onClick={handleClear} className="underline decoration-dotted underline-offset-2 hover:text-red-500">
            Delete everything
          </button>
        </div>
      </footer>
    </main>
  );
}
