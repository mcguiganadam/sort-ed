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
    <form onSubmit={handleSort}>
      <h2 className="text-sm font-bold uppercase tracking-wide">Quick capture</h2>
      {/* Modernist redesign: category pills are monochrome (outline when
          unselected, filled-dark when selected), not colour-coded — see
          the note at the top of app/page.tsx. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TASK_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTaskType(t)}
            className={`px-3 py-1 text-sm font-medium transition ${
              taskType === t
                ? "border border-flat-text bg-flat-text text-flat-bg"
                : "border border-flat-divider-mid bg-transparent text-flat-text hover:border-flat-text"
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
        className="mt-4 w-full border border-flat-divider-mid bg-white px-3 py-2 text-flat-text outline-none transition focus:border-flat-accent"
      />
      <button
        type="submit"
        className={`mt-3 w-full py-2 font-semibold text-white transition disabled:opacity-40 ${
          justSorted ? "bg-flat-accent-700" : "bg-flat-accent hover:bg-flat-accent-700"
        }`}
        disabled={!note.trim()}
      >
        {justSorted ? "Sorted ✓ — back to planning" : "Sort it"}
      </button>
    </form>
  );
}
