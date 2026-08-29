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

// A message the teacher chose to hide from the auto-detect feed without
// sorting it — "Ignore" on a newsletter, a recruiter email, anything that's
// never going to become a task. `ref` is the same compound "source:id" key
// AutoDetectPanel already uses to dedupe (e.g. "gmail:18d2f..."). Storing
// only that id, never the message content, keeps this consistent with the
// rest of the app's "nothing but what's needed to recognise the item again"
// storage: same local-only IndexedDB, so an ignored message stays hidden on
// every future scan without anything ever leaving the device.
export interface IgnoredItem {
  ref: string;
  ignoredAt: string;
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
  ignored: {
    key: string;
    value: IgnoredItem;
  };
}

const DB_NAME = "sorted";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<SortedDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("SortEd storage is browser-only — no server-side reads.");
  }
  if (!dbPromise) {
    dbPromise = openDB<SortedDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
          taskStore.createIndex("by-type", "taskType");
          taskStore.createIndex("by-created", "createdAt");
          db.createObjectStore("templates", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("ignored", { keyPath: "ref" });
        }
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

// Marks one auto-detected message as ignored, keyed by the same
// "source:id" ref AutoDetectPanel builds for every item — so it's gone from
// the feed now and stays gone on every future scan, without SortEd ever
// storing anything about what the message actually said.
export async function ignoreItem(ref: string): Promise<void> {
  const db = await getDB();
  await db.put("ignored", { ref, ignoredAt: new Date().toISOString() });
}

export async function listIgnoredRefs(): Promise<Set<string>> {
  const db = await getDB();
  const all = await db.getAll("ignored");
  return new Set(all.map((i) => i.ref));
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear("tasks");
  await db.clear("templates");
  await db.clear("ignored");
}

export async function exportAllData(): Promise<string> {
  const tasks = await listSortedTasks();
  const db = await getDB();
  const templates = await db.getAll("templates");
  const ignored = await db.getAll("ignored");
  return JSON.stringify({ exportedAt: new Date().toISOString(), tasks, templates, ignored }, null, 2);
}
