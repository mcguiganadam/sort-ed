"use client";

// components/AutoDetectPanel.tsx
//
// Single merged feed of recent Gmail + Slack activity that looks sortable,
// interleaved by recency. Each item is summarised and, where a keyword rule
// recognises it, labelled with one of the same categories quick capture
// uses (lib/heuristics.ts classifySnippet) — but deliberately not
// colour-coded here. Red/orange/green isn't decided at scan time at all
// any more (an earlier version of this asked for it right here, which
// Adam flagged as one more decision competing for attention on top of
// deciding whether to sort in the first place) — every newly-sorted task
// starts green/routine and gets its colour, or a different category, from
// the sorted list itself (components/SortedList.tsx), which — unlike this
// one-shot "Sort it" — stays editable for as long as the task sits there.
//
// This used to also offer an opt-in on-device AI summariser
// (lib/localAI.ts, WebGPU/WebLLM) — removed on Adam's call after it kept
// producing no visible improvement over the plain summary above (and, per
// the added-then-removed diagnostics, was silently failing to summarise
// most items at all rather than just summarising them poorly). lib/localAI.ts
// itself is left in place unused rather than deleted, in case on-device
// summarisation is worth revisiting later with a different approach.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { sortTask, ignoreItem, listIgnoredRefs, listSortedRefs, TaskType } from "@/lib/db";
import { TASK_TYPE_LABELS } from "@/lib/templates";
import { Urgency } from "@/lib/heuristics";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import SlackComingSoon from "@/components/SlackComingSoon";

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
  const [ignoredRefs, setIgnoredRefs] = useState<Set<string>>(new Set());
  // Refs already turned into a sorted task — persisted (lib/db.ts
  // sortTask writes to the "sortedRefs" store automatically), so a message
  // that's already been sorted doesn't come back the next time this scans,
  // or after a page reload. Ignoring and sorting both permanently remove
  // an item from this feed; they're just two different reasons why.
  const [sortedRefs, setSortedRefs] = useState<Set<string>>(new Set());

  // Loaded once on mount so anything already ignored or sorted in a
  // previous visit stays hidden from the very first scan, not just after
  // this tab acts on it.
  useEffect(() => {
    listIgnoredRefs().then(setIgnoredRefs);
    listSortedRefs().then(setSortedRefs);
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
      // The same "who — what" line shown right here in the feed, not
      // reduced to initials — the whole point of summarising it first was
      // so that context didn't have to be re-typed or thrown away at
      // sort time.
      initialCapture: `${item.from} — ${item.snippet}`,
      source: item.source === "gmail" ? "gmail" : "slack",
      sourceRef: item.ref,
    });
    setSortedRefs((prev) => new Set(prev).add(itemKey(item)));
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

  const visibleItems = items?.filter((i) => !sortedRefs.has(itemKey(i)) && !ignoredRefs.has(itemKey(i))) ?? [];
  const anyConnected = googleConnected || slackConnected;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide">Messages</h2>
        {anyConnected && (
          <button
            onClick={scan}
            disabled={loading}
            className="text-xs font-medium underline decoration-dotted hover:opacity-70"
          >
            {loading ? "Scanning…" : "Scan recent activity"}
          </button>
        )}
      </div>
      {/* Trimmed from a three-sentence paragraph (Adam: "too long") to one
          line — the full explanation now lives on the Privacy Policy page
          (app/privacy/page.tsx "What SortEd reads, if you connect it"), so
          this just needs to reassure at a glance and link out for anyone
          who wants the detail. */}
      <p className="mt-1 text-xs opacity-55">
        Read-only, never stored —{" "}
        <Link href="/privacy" className="underline decoration-dotted underline-offset-2 hover:opacity-70">
          how this works
        </Link>
        .
      </p>

      {!anyConnected && (
        <div className="mt-4 border border-dashed border-flat-divider p-4 text-sm">
          <p className="mb-2">Connect Gmail — nothing is read until you sign in.</p>
          <div className="flex flex-wrap items-center gap-2">
            <GoogleSignInButton />
            <SlackComingSoon />
          </div>
        </div>
      )}

      {anyConnected && (
        <>
          {/* Slack dropped out of this nag (Adam: "Hide Slack for now or
              Add coming soon") — there's no button to act on it with any
              more, and slackConnected can never flip true for a new sign-in
              right now, so a "Connect Slack too" prompt here would never
              go away even after Gmail was connected. */}
          {!googleConnected && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border border-flat-divider-soft px-3 py-2 text-xs opacity-80">
              <span>Connect Gmail too to see it in this feed:</span>
              <GoogleSignInButton />
            </div>
          )}

          {errors.map((e) => (
            <p key={e} className="mt-2 text-xs text-flat-urgent">
              {e}
            </p>
          ))}

          {items && visibleItems.length === 0 && errors.length === 0 && (
            <p className="mt-3 text-xs opacity-60">Nothing that looks sortable right now.</p>
          )}

          {/* Modernist redesign: rows sit directly on the page background,
              separated by 1px hairlines (via divide-y) rather than each
              getting its own tinted background — consistent with the
              flat, no-card system elsewhere on this page. */}
          <ul className="mt-4 divide-y divide-flat-divider-soft">
            {visibleItems.map((item) => {
              const key = itemKey(item);

              return (
                <li key={key} className="py-3 text-sm first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-wide opacity-55">
                      {SOURCE_LABEL[item.source]}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <strong>{item.from}</strong> — {item.snippet}
                    </span>
                    {item.suggestedType && (
                      <span className="shrink-0 whitespace-nowrap border border-flat-divider-soft px-2 py-0.5 text-xs">
                        {TASK_TYPE_LABELS[item.suggestedType]}
                      </span>
                    )}
                    <span className="shrink-0 whitespace-nowrap text-xs opacity-45">{timeAgo(item.timestamp)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <button
                      onClick={() => handleSort(item)}
                      disabled={!item.suggestedType}
                      className="font-medium underline decoration-dotted hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30 disabled:no-underline"
                    >
                      Sort it
                    </button>
                    <button
                      onClick={() => handleIgnore(item)}
                      className="font-medium opacity-70 underline decoration-dotted hover:opacity-100"
                    >
                      Ignore
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
