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
    <form onSubmit={handlePark} className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-sorted-leaf-dark">
        Ten-second capture
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {TASK_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTaskType(t)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              taskType === t
                ? "bg-sorted-leaf text-white shadow-sm"
                : "bg-sorted-leaf-soft text-sorted-leaf-dark hover:bg-sorted-leaf-soft/70"
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
        className="mt-4 w-full rounded-lg border border-sorted-border bg-white px-3 py-2 text-sorted-ink outline-none transition focus:border-sorted-leaf focus:ring-2 focus:ring-sorted-leaf/15"
      />
      <button
        type="submit"
        className={`mt-3 w-full rounded-lg py-2 font-medium text-white transition disabled:opacity-40 ${
          justParked ? "bg-sorted-leaf-dark" : "bg-sorted-leaf hover:bg-sorted-leaf-dark"
        }`}
        disabled={!note.trim()}
      >
        {justParked ? "Parked ✓ — back to planning" : "Park it"}
      </button>
    </form>
  );
}
