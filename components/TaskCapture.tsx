"use client";

import { useState } from "react";
import { sortTask, TaskType } from "@/lib/db";
import { TASK_TYPE_LABELS } from "@/lib/templates";

const TASK_TYPES: TaskType[] = [
  "pastoral",
  "inclusion",
  "parent",
  "leadership",
  "admin",
  "planning",
  "assessment",
  "ideas",
  "pd",
];

export default function TaskCapture({ onSorted }: { onSorted: () => void }) {
  const [taskType, setTaskType] = useState<TaskType>("pastoral");
  const [note, setNote] = useState("");
  const [justSorted, setJustSorted] = useState(false);

  // Red/orange/green isn't asked here any more — it's picked (and freely
  // changeable) in the sorted list itself, see components/SortedList.tsx.
  // Every task starts green/routine (lib/db.ts sortTask default) until the
  // teacher decides otherwise.
  async function handleSort(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await sortTask({ taskType, initialCapture: note.trim(), source: "manual" });
    setNote("");
    setJustSorted(true);
    onSorted();
    setTimeout(() => setJustSorted(false), 1200);
  }

  return (
    <form onSubmit={handleSort} className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-sorted-primary-dark">
        Quick capture
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {TASK_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTaskType(t)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              taskType === t
                ? "bg-sorted-primary text-white shadow-sm"
                : "bg-sorted-primary-soft text-sorted-primary-dark hover:bg-sorted-primary-soft/70"
            }`}
          >
            {TASK_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Initials + brief context — e.g. M.O. — lunchtime, playground"
        maxLength={140}
        autoFocus
        className="mt-4 w-full rounded-lg border border-sorted-border bg-white px-3 py-2 text-sorted-ink outline-none transition focus:border-sorted-primary focus:ring-2 focus:ring-sorted-primary/15"
      />
      <button
        type="submit"
        className={`mt-3 w-full rounded-lg py-2 font-medium text-white transition disabled:opacity-40 ${
          justSorted ? "bg-sorted-primary-dark" : "bg-sorted-primary hover:bg-sorted-primary-dark"
        }`}
        disabled={!note.trim()}
      >
        {justSorted ? "Sorted ✓ — back to planning" : "Sort it"}
      </button>
    </form>
  );
}
