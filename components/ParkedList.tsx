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
      <div className="rounded-2xl border border-dashed border-park-leaf/30 p-6 text-center text-sm text-park-ink/60">
        Nothing parked. Enjoy the quiet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, group]) => (
        <div key={type} className="rounded-2xl border border-park-leaf/20 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-park-leafdark">
            {TASK_TYPE_LABELS[type as keyof typeof TASK_TYPE_LABELS]} ({group.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {group.map((task) => (
              <li key={task.id} className="rounded-lg bg-park-bg px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-park-ink/80">{task.initialCapture}</span>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => openTemplate(task)} className="font-medium text-park-leaf hover:underline">
                      Log now
                    </button>
                    <button onClick={() => handleDelete(task)} className="text-park-ink/40 hover:text-red-500">
                      remove
                    </button>
                  </div>
                </div>

                {openId === task.id && (
                  <div className="mt-3 space-y-2 border-t border-park-leaf/10 pt-3">
                    {DEFAULT_TEMPLATES[task.taskType].fields.map((field) => (
                      <div key={field.key}>
                        <label className="text-xs font-medium text-park-leafdark">{field.label}</label>
                        {field.options ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {field.options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setFormValues((v) => ({ ...v, [field.key]: opt }))}
                                className={`rounded-full px-2 py-1 text-xs ${
                                  formValues[field.key] === opt
                                    ? "bg-park-leaf text-white"
                                    : "bg-white text-park-leafdark ring-1 ring-park-leaf/20"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            className="mt-1 w-full rounded border border-park-leaf/20 px-2 py-1 text-sm"
                            value={formValues[field.key] ?? ""}
                            onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => handleComplete(task)}
                      className="mt-2 rounded-lg bg-park-leaf px-3 py-1 text-sm text-white hover:bg-park-leafdark"
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
