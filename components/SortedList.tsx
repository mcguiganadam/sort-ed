"use client";

// components/SortedList.tsx
//
// The sorted list itself — grouped by the same category labels used
// everywhere else in the app, each task shown with the red/orange/green
// the teacher picked at sort time (lib/heuristics.ts URGENCY_STYLES).
//
// This used to expand into a per-category template form ("Log now" —
// Support type, Status, etc.) before a task could be marked done, which
// was its own small pile of decisions on top of sorting and colour-coding.
// Per Adam's "too much decision making" feedback, that's gone: a task sits
// here, coloured and labelled, until the teacher taps "Done" — which
// simply removes it. Nothing here resets by day either: listOpenTasks()
// has no date filter, so a sorted task carries over for as many days as it
// takes until it's deleted, which was already true and is now the only
// way a task leaves this list.
import { SortedTask, deleteTask } from "@/lib/db";
import { TASK_TYPE_LABELS } from "@/lib/templates";
import { URGENCY_STYLES } from "@/lib/heuristics";

export default function SortedList({
  tasks,
  onChanged,
}: {
  tasks: SortedTask[];
  onChanged: () => void;
}) {
  const grouped = tasks.reduce<Record<string, SortedTask[]>>((acc, t) => {
    (acc[t.taskType] ??= []).push(t);
    return acc;
  }, {});

  async function handleDone(task: SortedTask) {
    await deleteTask(task.id);
    onChanged();
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sorted-border p-6 text-center text-sm text-sorted-ink-soft">
        Nothing here yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, group]) => (
        <div key={type} className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
          <h3 className="font-display text-sm font-semibold text-sorted-primary-dark">
            {TASK_TYPE_LABELS[type as keyof typeof TASK_TYPE_LABELS]} ({group.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {group.map((task) => {
              // Tasks sorted before urgency existed have none stored — treat
              // as green/routine rather than crashing on a missing style.
              const urgencyStyle = URGENCY_STYLES[task.urgency ?? "normal"];
              return (
                <li
                  key={task.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border-l-4 bg-sorted-bg px-3 py-2 ${urgencyStyle.bar}`}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-sorted-ink">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${urgencyStyle.dot}`}
                      title={urgencyStyle.label}
                    />
                    <span className="truncate">{task.initialCapture}</span>
                  </span>
                  <button
                    onClick={() => handleDone(task)}
                    className="shrink-0 text-xs font-medium text-sorted-primary hover:underline"
                  >
                    Done
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
