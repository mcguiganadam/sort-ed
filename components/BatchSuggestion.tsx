"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { SortedTask } from "@/lib/db";

interface BusyBlock {
  start: string;
  end: string;
}

// Very simple free-slot finder: walk each weekday 08:00–16:00 in 15-minute
// steps and return the first gap of at least `minutes` that doesn't
// overlap a busy block. Good enough for a suggestion, not a full scheduler.
function findFreeSlot(busy: BusyBlock[], minutes: number): { start: Date; end: Date } | null {
  const now = new Date();
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;

    const dayStart = new Date(day);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(16, 0, 0, 0);

    let cursor = dayOffset === 0 && now > dayStart ? new Date(now) : dayStart;
    while (cursor.getTime() + minutes * 60000 <= dayEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + minutes * 60000);
      const overlaps = busy.some((b) => {
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        return cursor.getTime() < be && slotEnd.getTime() > bs;
      });
      if (!overlaps) return { start: cursor, end: slotEnd };
      cursor = new Date(cursor.getTime() + 15 * 60000);
    }
  }
  return null;
}

export default function BatchSuggestion({ openTasks }: { openTasks: SortedTask[] }) {
  const { data: session } = useSession();
  const googleConnected = Boolean((session as any)?.googleConnected);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estimatedMinutes = Math.max(15, openTasks.length * 4);

  async function suggest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/freebusy");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not read calendar.");
        return;
      }
      const found = findFreeSlot(json.busy ?? [], estimatedMinutes);
      setSlot(found);
      if (!found) setError("No clear gap found in the next 5 school days — try sorting fewer at once.");
    } catch {
      setError("Network error while reading calendar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-sorted-primary-dark">Find a clear moment</h2>
      <p className="mt-1 text-sm text-sorted-ink-soft">
        {openTasks.length} task{openTasks.length === 1 ? "" : "s"} sorted — waiting for a clear moment to clear them.
      </p>

      {!googleConnected ? (
        <button
          onClick={() => signIn("google")}
          className="mt-3 rounded-full bg-sorted-primary px-3 py-1 text-sm font-medium text-white transition hover:bg-sorted-primary-dark"
        >
          Connect Google Calendar to find one
        </button>
      ) : (
        <button
          onClick={suggest}
          disabled={loading || openTasks.length === 0}
          className="mt-3 rounded-full bg-sorted-primary px-3 py-1 text-sm font-medium text-white transition hover:bg-sorted-primary-dark disabled:opacity-40"
        >
          {loading ? "Checking your calendar…" : "Find a clear moment"}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {slot && (
        <p className="mt-3 rounded-lg bg-sorted-primary-soft px-3 py-2 text-sm text-sorted-primary-dark">
          {slot.start.toLocaleDateString(undefined, { weekday: "long" })}{" "}
          {slot.start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}–
          {slot.end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} — your next clear gap.
        </p>
      )}
    </div>
  );
}
