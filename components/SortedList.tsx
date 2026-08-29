"use client";

// components/SortedList.tsx
//
// The sorted list — grouped by red/orange/green (the order Adam listed
// them in), not by category. Each task shows its category as a small
// coloured pill styled the same as the auto-detect feed's own badges
// (lib/templates.ts CATEGORY_STYLES) — same visual language as the
// "mailbox" — but here it's a live dropdown, and the urgency dot next to
// it is a live UrgencyPicker, not a static label. That's the fix for
// "once sorted, it can't be relabelled or resorted": both the category and
// the colour stay editable for as long as a task sits in this list, via
// lib/db.ts updateTask(). "Done" is still the only way a task leaves —
// deletes it outright — and nothing here has ever reset by day, so an
// undeleted task carries over for as many days as it takes.
import { SortedTask, TaskType, deleteTask, updateTask } from "@/lib/db";
import { TASK_TYPE_LABELS, CATEGORY_STYLES } from "@/lib/templates";
import { Urgency, URGENCY_ORDER, URGENCY_STYLES } from "@/lib/heuristics";
import UrgencyPicker from "@/components/UrgencyPicker";

const TASK_TYPES: TaskType[] = [
  "pastoral",
  "inclusion",
  "parent",
  "leadership",
  "admin",
  "planning",
  "assessment",
  "ideas",
];

const URGENCY_GROUP_LABEL: Record<Urgency, string> = {
  urgent: "Red",
  soon: "Orange",
  normal: "Green",
};

export default function SortedList({
  tasks,
  onChanged,
}: {
  tasks: SortedTask[];
  onChanged: () => void;
}) {
  async function handleDone(task: SortedTask) {
    await deleteTask(task.id);
    onChanged();
  }

  async function handleRecolour(task: SortedTask, urgency: Urgency) {
    await updateTask(task.id, { urgency });
    onChanged();
  }

  async function handleRelabel(task: SortedTask, taskType: TaskType) {
    await updateTask(task.id, { taskType });
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
      {URGENCY_ORDER.map((urgency) => {
        const group = tasks.filter((t) => (t.urgency ?? "normal") === urgency);
        if (group.length === 0) return null;
        const style = URGENCY_STYLES[urgency];

        return (
          <div key={urgency} className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-sorted-primary-dark">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`} />
              {URGENCY_GROUP_LABEL[urgency]} ({group.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {group.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-sorted-bg px-3 py-2 text-sm"
                >
                  <UrgencyPicker value={urgency} onChange={(u) => handleRecolour(task, u)} />
                  <select
                    value={task.taskType}
                    onChange={(e) => handleRelabel(task, e.target.value as TaskType)}
                    className={`shrink-0 rounded-full border-none px-2 py-0.5 text-xs font-medium outline-none ${CATEGORY_STYLES[task.taskType]}`}
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TASK_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <span className="min-w-0 flex-1 truncate text-sorted-ink">{task.initialCapture}</span>
                  <button
                    onClick={() => handleDone(task)}
                    className="shrink-0 text-xs font-medium text-sorted-primary hover:underline"
                  >
                    Done
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
