// lib/db.ts
//
// ── THE "NO DATA STORED" PROMISE ──────────────────────────────────────────
// Everything a teacher sorts lives ONLY in this browser's IndexedDB. SortEd
// has no database, no server-side user table, no cloud sync. If the app's
// servers vanished tomorrow, nothing here would be lost or exposed, because
// nothing here ever left this device. Clearing browser data clears SortEd.
//
// This is a deliberate product + legal decision (see PARKITSUMMARY.md):
// behaviour notes and assessment data are student records, and the least
// risky thing we can do with student data is never receive it.
// ───────────────────────────────────────────────────────────────────────────

import { openDB, DBSchema, IDBPDatabase } from "idb";

export type TaskType =
  | "pastoral"
  | "inclusion"
  | "parent"
  | "leadership"
  | "admin"
  | "planning"
  | "assessment"
  | "ideas";

export interface SortedTask {
  id: string;
  taskType: TaskType;
  initialCapture: string; // "M.O. — lunchtime, playground"
  fullLog?: Record<string, string>; // filled in during the batch window
  source?: "manual" | "gmail" | "slack"; // where the capture originated
  sourceRef?: string; // e.g. gmail message id / slack ts — never the message body
  completedAt: string | null;
  createdAt: string;
}

export interface TaskTemplate {
  id: string;
  taskType: TaskType;
  templateName: string;
  fields: { key: string; label: string; options?: string[] }[];
  isDefault: boolean;
}

interface SortedDB extends DBSchema {
  tasks: {
    key: string;
    value: SortedTask;
    indexes: { "by-type": TaskType; "by-created": string };
  };
  templates: {
    key: string;
    value: TaskTemplate;
  };
}

const DB_NAME = "sorted";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SortedDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("SortEd storage is browser-only — no server-side reads.");
  }
  if (!dbPromise) {
    dbPromise = openDB<SortedDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
        taskStore.createIndex("by-type", "taskType");
        taskStore.createIndex("by-created", "createdAt");
        db.createObjectStore("templates", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

function newId() {
  return crypto.randomUUID();
}

export async function sortTask(input: {
  taskType: TaskType;
  initialCapture: string;
  source?: SortedTask["source"];
  sourceRef?: string;
}): Promise<SortedTask> {
  const db = await getDB();
  const task: SortedTask = {
    id: newId(),
    taskType: input.taskType,
    initialCapture: input.initialCapture,
    source: input.source ?? "manual",
    sourceRef: input.sourceRef,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  await db.put("tasks", task);
  return task;
}

export async function listSortedTasks(): Promise<SortedTask[]> {
  const db = await getDB();
  const all = await db.getAll("tasks");
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listOpenTasks(): Promise<SortedTask[]> {
  const tasks = await listSortedTasks();
  return tasks.filter((t) => !t.completedAt);
}

export async function completeTask(
  id: string,
  fullLog: Record<string, string>
): Promise<void> {
  const db = await getDB();
  const task = await db.get("tasks", id);
  if (!task) return;
  task.fullLog = fullLog;
  task.completedAt = new Date().toISOString();
  await db.put("tasks", task);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("tasks", id);
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear("tasks");
  await db.clear("templates");
}

export async function exportAllData(): Promise<string> {
  const tasks = await listSortedTasks();
  const db = await getDB();
  const templates = await db.getAll("templates");
  return JSON.stringify({ exportedAt: new Date().toISOString(), tasks, templates }, null, 2);
}
