"use client";

// components/TodaySchedule.tsx
//
// Replaces BatchSuggestion on the dashboard (Adam: "Show the agenda for the
// day from Google Calendar. Relabel it TODAY'S SCHEDULE"). BatchSuggestion
// searched for a free gap to go clear the sorted list; this instead just
// shows what's already on today's calendar — time + title, nothing else —
// loaded automatically rather than behind a button, since there's no
// decision to make here, only something to glance at. BatchSuggestion.tsx
// itself is left in place unused per this codebase's convention, in case
// the free-gap-finder is worth bringing back later, alongside or instead
// of this.
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

interface AgendaEvent {
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function todayWindow(): { timeMin: string; timeMax: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

export default function TodaySchedule() {
  const { data: session } = useSession();
  const googleConnected = Boolean((session as any)?.googleConnected);

  const [events, setEvents] = useState<AgendaEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!googleConnected) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { timeMin, timeMax } = todayWindow();
        const res = await fetch(
          `/api/calendar/agenda?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Could not read calendar.");
          return;
        }
        setEvents(json.events ?? []);
      } catch {
        if (!cancelled) setError("Network error while reading calendar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [googleConnected]);

  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide">Today&rsquo;s schedule</h2>

      {!googleConnected ? (
        <>
          <p className="mt-2 text-sm opacity-70">Connect Google Calendar to see today&rsquo;s agenda here.</p>
          <button
            onClick={() => signIn("google")}
            className="mt-3 border border-flat-text px-3 py-1 text-sm font-medium transition hover:bg-flat-text hover:text-flat-bg"
          >
            Connect Google Calendar
          </button>
        </>
      ) : (
        <>
          {loading && <p className="mt-2 text-xs opacity-70">Checking your calendar…</p>}
          {error && <p className="mt-2 text-xs text-flat-urgent">{error}</p>}
          {!loading && !error && events && events.length === 0 && (
            <p className="mt-2 text-sm opacity-70">Nothing on your calendar today.</p>
          )}
          {!loading && !error && events && events.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {events.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2.5 text-sm">
                  <span className="shrink-0 whitespace-nowrap font-semibold opacity-70">
                    {e.allDay || !e.start ? "All day" : formatTime(e.start)}
                  </span>
                  <span className="min-w-0 truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
