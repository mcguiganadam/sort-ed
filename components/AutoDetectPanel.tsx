"use client";

// components/AutoDetectPanel.tsx
//
// Single merged feed of recent Gmail + Slack activity that looks sortable,
// interleaved by recency. Each item is summarised and, where a keyword rule
// recognises it, labelled with one of the same categories quick capture
// uses (lib/heuristics.ts classifySnippet) — but deliberately NOT
// colour-coded automatically any more. This used to also auto-compute and
// display an urgency colour per item; per Adam's "too much decision
// making" feedback, that decision now belongs to the teacher, made once
// with UrgencyPicker at the moment of sorting (same control quick capture
// uses), not guessed and displayed passively before they've even looked.
//
// This used to also offer an opt-in on-device AI summariser
// (lib/localAI.ts, WebGPU/WebLLM) — removed on Adam's call after it kept
// producing no visible improvement over the plain summary above (and, per
// the added-then-removed diagnostics, was silently failing to summarise
// most items at all rather than just summarising them poorly). lib/localAI.ts
// itself is left in place unused rather than deleted, in case on-device
// summarisation is worth revisiting later with a different approach.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { sortTask, ignoreItem, listIgnoredRefs, TaskType } from "@/lib/db";
import { TASK_TYPE_LABELS } from "@/lib/templates";
import { Urgency } from "@/lib/heuristics";
import UrgencyPicker from "@/components/UrgencyPicker";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import SlackSignInButton from "@/components/SlackSignInButton";

interface DetectedItem {
  ref: string;
  from: string;
  subject?: string;
  snippet: string;
  raw: string;
  suggestedType: TaskType | null;
  suggestedInitials: string;
  urgency: Urgency;
  timestamp: number;
  source: "gmail" | "slack";
}

const CATEGORY_STYLES: Record<TaskType, string> = {
  pastoral: "bg-rose-50 text-rose-700",
  inclusion: "bg-purple-50 text-purple-700",
  parent: "bg-sky-50 text-sky-700",
  leadership: "bg-amber-50 text-amber-700",
  admin: "bg-slate-100 text-slate-700",
  planning: "bg-indigo-50 text-indigo-700",
  assessment: "bg-teal-50 text-teal-700",
  ideas: "bg-lime-50 text-lime-700",
};

const SOURCE_LABEL: Record<DetectedItem["source"], string> = {
  gmail: "Gmail",
  slack: "Slack",
};

function timeAgo(ms: number): string {
  const diffMin = Math.round((Date.now() - ms) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function itemKey(item: DetectedItem): string {
  return `${item.source}:${item.ref}`;
}

export default function AutoDetectPanel({ onSorted }: { onSorted: () => void }) {
  const { data: session } = useSession();
  const googleConnected = Boolean((session as any)?.googleConnected);
  const slackConnected = Boolean((session as any)?.slackConnected);

  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [ignoredRefs, setIgnoredRefs] = useState<Set<string>>(new Set());
  // Per-item urgency the teacher has explicitly picked in UrgencyPicker,
  // keyed by itemKey. Falls back to the server's keyword-guessed
  // item.urgency as a starting point until touched — a default the teacher
  // can see and change, not a decision made silently on their behalf.
  const [urgencyChoice, setUrgencyChoice] = useState<Record<string, Urgency>>({});

  // Loaded once on mount so a message ignored in a previous visit stays
  // hidden from the very first scan, not just after this tab ignores it.
  useEffect(() => {
    listIgnoredRefs().then(setIgnoredRefs);
  }, []);

  async function scan() {
    setLoading(true);
    setErrors([]);
    const collected: DetectedItem[] = [];
    const newErrors: string[] = [];

    await Promise.all(
      [
        googleConnected ? { endpoint: "/api/gmail/scan", label: "Gmail" } : null,
        slackConnected ? { endpoint: "/api/slack/scan", label: "Slack" } : null,
      ]
        .filter((s): s is { endpoint: string; label: string } => s !== null)
        .map(async (s) => {
          try {
            const res = await fetch(s.endpoint);
            const json = await res.json();
            if (!res.ok) {
              newErrors.push(`${s.label}: ${json.error ?? "Could not scan."}`);
            } else {
              collected.push(...(json.items ?? []));
            }
          } catch {
            newErrors.push(`${s.label}: network error while scanning.`);
          }
        })
    );

    collected.sort((a, b) => b.timestamp - a.timestamp);
    setItems(collected);
    setErrors(newErrors);
    setLoading(false);
  }

  async function handleSort(item: DetectedItem) {
    if (!item.suggestedType) return;
    await sortTask({
      taskType: item.suggestedType,
      urgency: urgencyChoice[itemKey(item)] ?? item.urgency,
      initialCapture: `${item.suggestedInitials} — via ${SOURCE_LABEL[item.source]}`,
      source: item.source === "gmail" ? "gmail" : "slack",
      sourceRef: item.ref,
    });
    setDismissed((prev) => new Set(prev).add(itemKey(item)));
    onSorted();
  }

  // Not every scanned item is worth sorting — a newsletter, a recruiter
  // email, anything that will never become a task. Ignoring one removes it
  // from the feed permanently (see lib/db.ts) rather than just for this
  // visit, since re-seeing the same non-task every scan is exactly the kind
  // of noise this feed is meant to cut down on.
  async function handleIgnore(item: DetectedItem) {
    const key = itemKey(item);
    await ignoreItem(key);
    setIgnoredRefs((prev) => new Set(prev).add(key));
  }

  const visibleItems = items?.filter((i) => !dismissed.has(itemKey(i)) && !ignoredRefs.has(itemKey(i))) ?? [];
  const anyConnected = googleConnected || slackConnected;

  return (
    <div className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-sorted-primary-dark">
          Messages
        </h2>
        {anyConnected && (
          <button
            onClick={scan}
            disabled={loading}
            className="text-xs font-medium text-sorted-primary underline decoration-dotted hover:text-sorted-primary-dark"
          >
            {loading ? "Scanning…" : "Scan recent activity"}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-sorted-ink-soft">
        Read-only, and summarised entirely on this request — nothing scanned here is stored, and
        no message content is sent anywhere by default. It's only ever held in this browser tab
        while you decide what to sort.
      </p>

      {!anyConnected && (
        <div className="mt-4 rounded-xl border border-dashed border-sorted-border p-4 text-sm text-sorted-primary-dark">
          <p className="mb-2">Connect Gmail and/or Slack — nothing is read until you sign in.</p>
          <div className="flex flex-wrap items-center gap-2">
            <GoogleSignInButton />
            <SlackSignInButton />
          </div>
        </div>
      )}

      {anyConnected && (
        <>
          {(!googleConnected || !slackConnected) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-sorted-bg px-3 py-2 text-xs text-sorted-ink-soft">
              <span>
                {googleConnected ? "Connect Slack too" : "Connect Gmail too"} to see it in this
                feed:
              </span>
              {!googleConnected && <GoogleSignInButton />}
              {!slackConnected && <SlackSignInButton />}
            </div>
          )}

          {errors.map((e) => (
            <p key={e} className="mt-2 text-xs text-red-600">
              {e}
            </p>
          ))}

          {items && visibleItems.length === 0 && errors.length === 0 && (
            <p className="mt-3 text-xs text-sorted-ink-soft">Nothing that looks sortable right now.</p>
          )}

          <ul className="mt-3 space-y-2">
            {visibleItems.map((item) => {
              const key = itemKey(item);
              const chosenUrgency = urgencyChoice[key] ?? item.urgency;

              return (
                <li key={key} className="overflow-hidden rounded-lg bg-sorted-bg px-3 py-2 text-sm">
                  {/* Deliberately ONE flat flex row, no nesting and no flex-wrap: the
                      previous version nested a "flex min-w-0" group inside a
                      "flex flex-wrap justify-between" parent, and flex-wrap's
                      line-breaking decision is based on each item's *hypothetical*
                      (un-shrunk) content width — which for a nowrap text node is
                      its full, un-truncated width regardless of min-w-0 further
                      down. That's what let a long subject line force the row to
                      overflow/wrap instead of eliding. With everything as direct
                      siblings of one non-wrapping flex container, the summary
                      span is the only flexible (flex-1 min-w-0) item, so it's the
                      only one that can absorb a too-narrow row, and the fixed-size
                      badges sit wherever their shrink-0 width puts them. */}
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-sorted-ink-soft">
                      {SOURCE_LABEL[item.source]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sorted-ink">
                      <strong>{item.from}</strong> — {item.snippet}
                    </span>
                    {item.suggestedType && (
                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${CATEGORY_STYLES[item.suggestedType]}`}
                      >
                        {TASK_TYPE_LABELS[item.suggestedType]}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <UrgencyPicker
                      value={chosenUrgency}
                      onChange={(u) => setUrgencyChoice((prev) => ({ ...prev, [key]: u }))}
                    />
                    <button
                      onClick={() => handleSort(item)}
                      disabled={!item.suggestedType}
                      className="font-medium text-sorted-primary hover:underline disabled:cursor-not-allowed disabled:text-sorted-ink-soft/50 disabled:no-underline"
                    >
                      Sort it
                    </button>
                    <button
                      onClick={() => handleIgnore(item)}
                      className="font-medium text-sorted-ink-soft hover:text-sorted-ink hover:underline"
                    >
                      Ignore
                    </button>
                    <span className="ml-auto text-sorted-ink-soft/70">{timeAgo(item.timestamp)}</span>
                  </div>
                  {!item.suggestedType && (
                    <p className="mt-1 text-[11px] text-sorted-ink-soft/70">
                      No category recognised — Ignore it, or add it via Quick capture instead.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
