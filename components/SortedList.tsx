"use client";

// components/SortedList.tsx
//
// The sorted list, grouped into four boxes — Unsorted, then Urgent / Next
// / Later — the three triage boxes each coloured red/orange/green (Adam:
// "Boxes need to be the colour of their label" — lib/heuristics.ts
// URGENCY_STYLES.box). Unsorted is where every new task lands (quick
// capture, or sorting straight from the mailbox feed — see lib/db.ts
// sortTask's default) until a teacher actually triages it via Edit below;
// it gets a plain, neutral box rather than a fourth traffic-light colour,
// since it isn't a triage level, just the absence of one yet.
//
// Changing a task's urgency used to be a live dropdown sitting right on
// the row, styled as a colour-coded pill. Adam: "Instead of the drop
// down, place an Edit button left of Done. This opens up below showing
// the 3 levels of urgency and the sort type (eg: Pastoral). When OK by
// the user, this move the item to one of the three urgency boxes." So
// each row now shows its urgency and category as plain (non-interactive)
// pills, plus an Edit button; Edit expands a small panel below the row
// with the three Urgent/Next/Later options to choose from.
//
// The category shown in that panel started out read-only, but Adam
// followed up ("They do not appear in the edit" — the category couldn't
// actually be changed there) asking for it to be pickable too, not just
// displayed. It's now a coloured <select> right next to the urgency
// buttons, defaulting to the task's current category — OK applies both
// the chosen urgency and the chosen category together.
import { useState } from "react";
import { SortedTask, TaskType, deleteTask, updateTask } from "@/lib/db";
import { TASK_TYPE_LABELS, CATEGORY_STYLES } from "@/lib/templates";
import { Urgency, URGENCY_ORDER, TRIAGE_ORDER, URGENCY_STYLES } from "@/lib/heuristics";

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

export default function SortedList({
  tasks,
  onChanged,
}: {
  tasks: SortedTask[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingUrgency, setPendingUrgency] = useState<Urgency>("normal");
  const [pendingCategory, setPendingCategory] = useState<TaskType>("pastoral");

  // Done is the only way a task leaves the list, and it's a hard delete —
  // no undo, nothing recoverable. Adam: "I am worried about people
  // accidently hitting Done and the task disappearing." A confirm() here
  // matches how app/page.tsx already guards "Delete everything" — same
  // one-tap-away-from-permanent risk, same fix, rather than inventing a
  // second pattern (an undo toast, a two-step button) for what's really
  // the same problem.
  async function handleDone(task: SortedTask) {
    if (!confirm(`Mark this done and remove it from the list?\n\n"${task.initialCapture}"`)) return;
    await deleteTask(task.id);
    onChanged();
  }

  function handleEditToggle(task: SortedTask) {
    if (editingId === task.id) {
      setEditingId(null);
      return;
    }
    setEditingId(task.id);
    // The picker only offers the three real triage levels (TRIAGE_ORDER),
    // so an "unsorted" (or missing, pre-this-field) task starts the
    // picker on "Later" rather than on a level it can't actually show as
    // selected.
    setPendingUrgency(task.urgency && task.urgency !== "unsorted" ? task.urgency : "normal");
    setPendingCategory(task.taskType);
  }

  async function handleApply(task: SortedTask) {
    await updateTask(task.id, { urgency: pendingUrgency, taskType: pendingCategory });
    setEditingId(null);
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
        const group = tasks.filter((t) => (t.urgency ?? "unsorted") === urgency);
        if (group.length === 0) return null;
        const style = URGENCY_STYLES[urgency];

        return (
          <div key={urgency} className={`rounded-2xl border p-5 shadow-card ${style.box}`}>
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-sorted-primary-dark">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`} />
              {style.label} ({group.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {group.map((task) => {
                const isEditing = editingId === task.id;
                return (
                  <li key={task.id} className="rounded-lg bg-sorted-bg px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* No urgency label here any more (Adam: "The Next label
                          (also Urgent and Later) not needed as the box does
                          this job.") — the section's own coloured box (see
                          style.box below) already says which one this is;
                          repeating it as a per-row pill was redundant. The
                          category pill stays, and stays a pill on purpose
                          (Adam: "should have a pill around it to have it
                          stand out from the sorted task") — it's the one
                          piece of information the box's colour can't convey. */}
                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[task.taskType]}`}
                      >
                        {TASK_TYPE_LABELS[task.taskType]}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sorted-ink">{task.initialCapture}</span>
                      {/* -my-1 py-1 px-1.5: a bigger tap target for touch without
                          growing the row's visible height or shifting the text's
                          position — the negative margin gives back exactly what the
                          padding added. */}
                      <button
                        onClick={() => handleEditToggle(task)}
                        className="-my-1 shrink-0 rounded px-1.5 py-1 text-xs font-medium text-sorted-primary-dark hover:underline"
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleDone(task)}
                        className="-my-1 shrink-0 rounded px-1.5 py-1 text-xs font-medium text-sorted-primary hover:underline"
                      >
                        Done
                      </button>
                    </div>

                    {isEditing && (
                      // Mobile formatting pass: at phone width, the three urgency
                      // buttons + "Category:" + the select + OK don't fit on one
                      // line — flex-wrap alone just breaks them across lines
                      // wherever they happen to run out of room, and OK's ml-auto
                      // then strands it on its own line, flush right with a big gap
                      // of empty space to its left. Below sm, this stacks into three
                      // deliberate rows (urgency / category / OK) instead; at sm and
                      // up there's room for the original single-line layout, so it
                      // reverts to flex-row with ml-auto behaving as before.
                      <div className="mt-2 flex flex-col gap-3 rounded-lg border border-sorted-border bg-white px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:py-2">
                        <div className="flex gap-2">
                          {TRIAGE_ORDER.map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setPendingUrgency(u)}
                              className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition sm:flex-none sm:py-0.5 ${URGENCY_STYLES[u].pill} ${
                                pendingUrgency === u ? "ring-2 ring-offset-1 ring-sorted-ink/40" : "opacity-50 hover:opacity-100"
                              }`}
                            >
                              {URGENCY_STYLES[u].label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-xs text-sorted-ink-soft">Category:</span>
                          <select
                            value={pendingCategory}
                            onChange={(e) => setPendingCategory(e.target.value as TaskType)}
                            className={`min-w-0 flex-1 rounded-full border-none px-2 py-1.5 text-xs font-medium outline-none sm:flex-none sm:py-0.5 ${CATEGORY_STYLES[pendingCategory]}`}
                          >
                            {TASK_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {TASK_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => handleApply(task)}
                          className="w-full shrink-0 rounded-full bg-sorted-primary py-2 text-xs font-medium text-white transition hover:bg-sorted-primary-dark sm:ml-auto sm:w-auto sm:px-3 sm:py-1"
                        >
                          OK
                        </button>
                      </div>
                    )}
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
