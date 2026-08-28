"use client";

import { useState } from "react";
import { ParkedTask, completeTask, deleteTask } from "@/lib/db";
import { DEFAULT_TEMPLATES, TASK_TYPE_LABELS } from "@/lib/templates";

export default function ParkedList({
  tasks,
  onChanged,
}: {
  tasks: ParkedTask[];
  onChanged: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const grouped = tasks.reduce<Record<string, ParkedTask[]>>((acc, t) => {
    (acc[t.taskType] ??= []).push(t);
    return acc;
  }, {});

  function openTemplate(task: ParkedTask) {
    setOpenId(task.id);
    setFormValues({});
  }

  async function handleComplete(task: ParkedTask) {
    await completeTask(task.id, formValues);
    setOpenId(null);
    onChanged();
  }

  async function handleDelete(task: ParkedTask) {
    await deleteTask(task.id);
    onChanged();
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sorted-border p-6 text-center text-sm text-sorted-ink-soft">
        Nothing parked. Enjoy the quiet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, group]) => (
        <div key={type} className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
          <h3 className="font-display text-sm font-semibold text-sorted-leaf-dark">
            {TASK_TYPE_LABELS[type as keyof typeof TASK_TYPE_LABELS]} ({group.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {group.map((task) => (
              <li key={task.id} className="rounded-lg bg-sorted-bg px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-sorted-ink">{task.initialCapture}</span>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => openTemplate(task)} className="font-medium text-sorted-leaf hover:underline">
                      Log now
                    </button>
                    <button onClick={() => handleDelete(task)} className="text-sorted-ink-soft hover:text-red-500">
                      remove
                    </button>
                  </div>
                </div>

                {openId === task.id && (
                  <div className="mt-3 space-y-2 border-t border-sorted-border pt-3">
                    {DEFAULT_TEMPLATES[task.taskType].fields.map((field) => (
                      <div key={field.key}>
                        <label className="text-xs font-medium text-sorted-leaf-dark">{field.label}</label>
                        {field.options ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {field.options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setFormValues((v) => ({ ...v, [field.key]: opt }))}
                                className={`rounded-full px-2 py-1 text-xs font-medium transition ${
                                  formValues[field.key] === opt
                                    ? "bg-sorted-leaf text-white"
                                    : "bg-white text-sorted-leaf-dark ring-1 ring-sorted-leaf/20 hover:bg-sorted-leaf-soft"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            className="mt-1 w-full rounded border border-sorted-border px-2 py-1 text-sm outline-none transition focus:border-sorted-leaf focus:ring-2 focus:ring-sorted-leaf/15"
                            value={formValues[field.key] ?? ""}
                            onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => handleComplete(task)}
                      className="mt-2 rounded-lg bg-sorted-leaf px-3 py-1 text-sm font-medium text-white transition hover:bg-sorted-leaf-dark"
                    >
                      Done
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
