"use client";

// components/SortedList.tsx
//
// The sorted list, grouped into four boxes — Unsorted, then Urgent / Next
// / Later — the three triage boxes each coloured red/orange/blue (Adam:
// "Boxes need to be the colour of their label"; the Modernist redesign,
// design handoff 2026-08-30, keeps this same rule but swaps "Later" from
// green to the system's blue accent — see the note in app/page.tsx about
// red being reserved for true urgency, not the default brand colour).
// Unsorted is where every new task lands (quick capture, or sorting
// straight from the mailbox feed — see lib/db.ts sortTask's default)
// until a teacher actually triages it via Edit below; it gets a plain,
// dashed-outline box rather than a fourth colour, since it isn't a triage
// level, just the absence of one yet.
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
// displayed. It's now a row of category buttons (previously a coloured
// <select>; the Modernist redesign's edit panel uses pill buttons
// instead, matching Quick Capture's picker), defaulting to the task's
// current category — OK applies both the chosen urgency and the chosen
// category together.
import { useState } from "react";
import { SortedTask, TaskType, deleteTask, updateTask } from "@/lib/db";
import { TASK_TYPE_LABELS } from "@/lib/templates";
import { Urgency, URGENCY_ORDER, TRIAGE_ORDER } from "@/lib/heuristics";

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

// Group box styling per the handoff's explicit hex values (not the
// CSS-variable-driven urgBtnStyleA from the prototype's edit-panel picker
// below, which is a separate case — see the comment above URGENCY_PICKER_STYLES).
const GROUP_STYLES: Record<Urgency, { box: string; heading: string; label: string }> = {
  unsorted: { box: "border border-dashed border-flat-divider", heading: "", label: "Unsorted" },
  urgent: { box: "border-l-4 border-l-flat-urgent bg-flat-urgent-bg", heading: "text-flat-urgent-heading", label: "Urgent" },
  soon: { box: "border-l-4 border-l-flat-next bg-flat-next-bg", heading: "text-flat-next", label: "Next" },
  normal: { box: "border-l-4 border-l-flat-accent bg-flat-accent-100", heading: "text-flat-accent-700", label: "Later" },
};

// The edit panel's urgency-picker buttons (Urgent/Next/Later, selectable).
// The prototype's own urgBtnStyleA function reads CSS variables that are
// scoped to blue for the whole redesign (--color-accent, overridden to
// #2f5a8a right at the top of the page) -- which, followed literally,
// would make the *selected* "Urgent" button render blue, directly
// contradicting the handoff's own explicit rule ("red reserved for the
// Urgent state... don't pull --color-accent as-is for anything that IS
// urgency-signaling"). Implemented the stated rule here instead of the
// apparent variable-scoping bug: each option's selected state uses its
// real urgency colour (matching the group boxes above), not a shared
// accent variable.
const URGENCY_PICKER_SELECTED: Record<Urgency, string> = {
  unsorted: "",
  urgent: "border border-flat-urgent bg-flat-urgent text-white",
  soon: "border border-flat-next bg-flat-next text-white",
  normal: "border border-flat-accent bg-flat-accent text-white",
};
const URGENCY_PICKER_UNSELECTED =
  "border border-flat-divider-mid bg-transparent text-flat-text hover:border-flat-text";

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
      <div className="border border-dashed border-flat-divider p-6 text-center text-sm opacity-60">
        Nothing here yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {URGENCY_ORDER.map((urgency) => {
        const group = tasks.filter((t) => (t.urgency ?? "unsorted") === urgency);
        if (group.length === 0) return null;
        const style = GROUP_STYLES[urgency];

        return (
          <div key={urgency} className={`p-5 ${style.box}`}>
            <h3 className={`text-xs font-bold ${style.heading}`}>
              {style.label} ({group.length})
            </h3>
            <ul className="mt-3 divide-y divide-flat-divider-soft">
              {group.map((task) => {
                const isEditing = editingId === task.id;
                return (
                  <li key={task.id} className="py-2.5 text-sm first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* No urgency label here any more (Adam: "The Next label
                          (also Urgent and Later) not needed as the box does
                          this job.") — the section's own coloured box (see
                          style.box above) already says which one this is;
                          repeating it as a per-row pill was redundant. The
                          category pill stays (Adam: "should have a pill
                          around it to have it stand out from the sorted
                          task") — it's the one piece of information the
                          box's colour can't convey. Monochrome outline per
                          the Modernist redesign, not colour-coded — see the
                          note at the top of app/page.tsx. */}
                      <span className="shrink-0 whitespace-nowrap border border-flat-divider-soft px-2 py-0.5 text-xs font-medium">
                        {TASK_TYPE_LABELS[task.taskType]}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{task.initialCapture}</span>
                      <button
                        onClick={() => handleEditToggle(task)}
                        className="shrink-0 text-xs font-medium underline decoration-dotted hover:opacity-70"
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleDone(task)}
                        className="shrink-0 text-xs font-medium underline decoration-dotted hover:opacity-70"
                      >
                        Done
                      </button>
                    </div>

                    {isEditing && (
                      // Split into two clearly labeled groups (urgency,
                      // then category) stacked on their own rows, always --
                      // not just on mobile. Adam: with all three urgency
                      // buttons and all nine category buttons flowing into
                      // one row on wider screens, it read as ~13 choices
                      // thrown at the user at once ("this amount of choice
                      // will confuse and overwhelm"). The buttons
                      // themselves didn't change, just the grouping: two
                      // small labeled decisions instead of one big wall.
                      <div className="mt-2 flex flex-col gap-3 border border-flat-divider-mid p-3">
                        {/* Urgency and Category side by side (wraps to
                            stacked on narrow screens) -- Adam asked for
                            the category dropdown to sit to the right of
                            the urgency buttons instead of on its own row
                            below. */}
                        <div className="flex flex-wrap items-start gap-4">
                          <div>
                            <span className="mb-1.5 block text-[11px] uppercase tracking-wide opacity-50">
                              Urgency
                            </span>
                            <div className="flex gap-2">
                              {TRIAGE_ORDER.map((u) => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => setPendingUrgency(u)}
                                  className={`flex-1 px-2.5 py-1.5 text-xs font-medium transition sm:flex-none ${
                                    pendingUrgency === u ? URGENCY_PICKER_SELECTED[u] : URGENCY_PICKER_UNSELECTED
                                  }`}
                                >
                                  {u === "urgent" ? "Urgent" : u === "soon" ? "Next" : "Later"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="mb-1.5 block text-[11px] uppercase tracking-wide opacity-50">
                              Category
                            </span>
                            {/* Dropdown instead of a 9-button row -- Adam:
                                even split out under its own label, nine
                                buttons alongside the three urgency buttons
                                still read as too many choices at once. A
                                select collapses it to one compact control;
                                urgency stays as buttons since there are only
                                three and their colors match the group boxes
                                elsewhere on the page. */}
                            <div className="relative w-full max-w-[220px]">
                              <select
                                value={pendingCategory}
                                onChange={(e) => setPendingCategory(e.target.value as TaskType)}
                                className="w-full appearance-none rounded-none border border-flat-divider-mid bg-white px-2.5 py-1.5 pr-8 text-xs font-medium text-flat-text transition focus:border-flat-accent focus:outline-none"
                              >
                                {TASK_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {TASK_TYPE_LABELS[t]}
                                  </option>
                                ))}
                              </select>
                              <svg
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                                width="10"
                                height="6"
                                viewBox="0 0 10 6"
                                aria-hidden="true"
                              >
                                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApply(task)}
                          className="w-full shrink-0 bg-flat-accent py-2 text-xs font-semibold text-white transition hover:bg-flat-accent-700 sm:ml-auto sm:w-auto sm:px-4 sm:py-1.5"
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
