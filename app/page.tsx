"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { ParkedTask, listOpenTasks, exportAllData, clearAllData } from "@/lib/db";
import TaskCapture from "@/components/TaskCapture";
import ParkedList from "@/components/ParkedList";
import AutoDetectPanel from "@/components/AutoDetectPanel";
import BatchSuggestion from "@/components/BatchSuggestion";
import KofiButton from "@/components/KofiButton";

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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-park-leafdark">SortEd 🌿</h1>
          <p className="text-sm text-park-ink/60">Consider it sorted.</p>
        </div>
        <KofiButton />
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        {status === "authenticated" ? (
          <>
            <span className="text-park-ink/60">Signed in as {session?.user?.email}</span>
            <button onClick={() => signOut()} className="text-park-leaf underline decoration-dotted">
              Sign out
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => signIn("google")} className="rounded-full bg-white px-3 py-1 ring-1 ring-park-leaf/30 hover:bg-park-leaf/10">
              Connect Google
            </button>
            <button onClick={() => signIn("slack")} className="rounded-full bg-white px-3 py-1 ring-1 ring-park-leaf/30 hover:bg-park-leaf/10">
              Connect Slack
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6">
        <TaskCapture onParked={refresh} />
        <BatchSuggestion openTasks={tasks} />
        <AutoDetectPanel onParked={refresh} />
        <ParkedList tasks={tasks} onChanged={refresh} />
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-park-leaf/10 pt-6 text-xs text-park-ink/50">
        <p>
          Everything above lives only in this browser (IndexedDB). Nothing is uploaded to a SortEd
          server — ever.
        </p>
        <div className="flex gap-4">
          <button onClick={handleExport} className="underline decoration-dotted hover:text-park-ink">
            Export my data
          </button>
          <button onClick={handleClear} className="underline decoration-dotted hover:text-red-500">
            Delete everything
          </button>
        </div>
      </footer>
    </main>
  );
}
