"use client";

import { useState } from "react";
import { parkTask, TaskType } from "@/lib/db";
import { TASK_TYPE_LABELS } from "@/lib/templates";

const TASK_TYPES: TaskType[] = ["behaviour", "assessment", "parent", "leader", "meeting"];

export default function TaskCapture({ onParked }: { onParked: () => void }) {
  const [taskType, setTaskType] = useState<TaskType>("behaviour");
  const [note, setNote] = useState("");
  const [justParked, setJustParked] = useState(false);

  async function handlePark(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await parkTask({ taskType, initialCapture: note.trim(), source: "manual" });
    setNote("");
    setJustParked(true);
    onParked();
    setTimeout(() => setJustParked(false), 1200);
  }

  return (
    <form onSubmit={handlePark} className="rounded-2xl border border-park-leaf/20 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-park-leafdark">
        Ten-second capture
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {TASK_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTaskType(t)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              taskType === t
                ? "bg-park-leaf text-white"
                : "bg-park-leaf/10 text-park-leafdark hover:bg-park-leaf/20"
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
        className="mt-4 w-full rounded-lg border border-park-leaf/20 px-3 py-2 text-park-ink outline-none focus:border-park-leaf"
      />
      <button
        type="submit"
        className="mt-3 w-full rounded-lg bg-park-leaf py-2 font-medium text-white transition hover:bg-park-leafdark disabled:opacity-40"
        disabled={!note.trim()}
      >
        {justParked ? "Parked ✓ — back to planning" : "Park it"}
      </button>
    </form>
  );
}
