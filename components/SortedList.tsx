"use client";

// components/SortedList.tsx
//
// The sorted list, grouped into three boxes — Urgent / Next / Later — each
// still coloured red/orange/green. Each task's own dropdown IS the sort:
// picking a different option moves the task straight into that box. This
// replaces two earlier attempts: a plain 3-dot colour picker (Adam: "The
// circle buttons have not function and look terrible") and, before that,
// a second dropdown that duplicated the category picker's look while doing
// something completely different (Adam: "The drop down needs to be the
// triaging: Urgent / Next / Later. This then sorts that task or message
// into the Urgent, Next or Later box.").
//
// Category (Pastoral etc.) is shown next to it as a plain, non-editable
// coloured pill — same visual language as the mailbox feed's own badges
// (lib/templates.ts CATEGORY_STYLES) — rather than a second dropdown, per
// Adam's own choice between the two when asked. lib/db.ts's updateTask
// already supports changing taskType as well as urgency, so wiring a
// category editor back in here later (a dropdown, an edit-in-place) is a
// small change if that flexibility turns out to be wanted after all.
import { SortedTask, TaskType, deleteTask, updateTask } from "@/lib/db";
import { TASK_TYPE_LABELS, CATEGORY_STYLES } from "@/lib/templates";
import { Urgency, URGENCY_ORDER, URGENCY_STYLES } from "@/lib/heuristics";

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
              {style.label} ({group.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {group.map((task) => {
                const taskUrgency = task.urgency ?? "normal";
                return (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-sorted-bg px-3 py-2 text-sm"
                  >
                    <select
                      value={taskUrgency}
                      onChange={(e) => handleRecolour(task, e.target.value as Urgency)}
                      aria-label="Sort into"
                      className={`shrink-0 rounded-full border-none px-2 py-0.5 text-xs font-medium outline-none ${URGENCY_STYLES[taskUrgency].pill}`}
                    >
                      {URGENCY_ORDER.map((u) => (
                        <option key={u} value={u}>
                          {URGENCY_STYLES[u].label}
                        </option>
                      ))}
                    </select>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[task.taskType]}`}
                    >
                      {TASK_TYPE_LABELS[task.taskType]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sorted-ink">{task.initialCapture}</span>
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
        );
      })}
    </div>
  );
}
