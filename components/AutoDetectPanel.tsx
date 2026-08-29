"use client";

// components/AutoDetectPanel.tsx
//
// Single merged feed of recent Gmail + Slack activity that looks sortable,
// interleaved by recency, each item colour-coded twice: an urgency bar
// (red/amber/green, keyword-based — see lib/heuristics.ts scoreUrgency)
// and a category badge (pastoral/inclusion/parent/etc.). Every "who/what"
// summary line is built locally from data already fetched for
// classification — nothing here is sent to a third-party model API.

import { useState } from "react";
import { useSession } from "next-auth/react";
import { sortTask, TaskType } from "@/lib/db";
import { buildMailtoDraft } from "@/lib/mailto";
import { TASK_TYPE_LABELS } from "@/lib/templates";
import { Urgency } from "@/lib/heuristics";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import SlackSignInButton from "@/components/SlackSignInButton";

interface DetectedItem {
  ref: string;
  from: string;
  subject?: string;
  snippet: string;
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

const URGENCY_STYLES: Record<Urgency, { bar: string; dot: string; label: string }> = {
  urgent: { bar: "border-red-500", dot: "bg-red-500", label: "Urgent" },
  soon: { bar: "border-sorted-amber", dot: "bg-sorted-amber", label: "Soon" },
  normal: { bar: "border-sorted-triage", dot: "bg-sorted-triage", label: "Routine" },
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

export default function AutoDetectPanel({ onSorted }: { onSorted: () => void }) {
  const { data: session } = useSession();
  const googleConnected = Boolean((session as any)?.googleConnected);
  const slackConnected = Boolean((session as any)?.slackConnected);

  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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
      initialCapture: `${item.suggestedInitials} — via ${SOURCE_LABEL[item.source]}`,
      source: item.source === "gmail" ? "gmail" : "slack",
      sourceRef: item.ref,
    });
    setDismissed((prev) => new Set(prev).add(`${item.source}:${item.ref}`));
    onSorted();
  }

  const visibleItems = items?.filter((i) => !dismissed.has(`${i.source}:${i.ref}`)) ?? [];
  const anyConnected = googleConnected || slackConnected;

  return (
    <div className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-sorted-primary-dark">
          Auto-detect from Gmail &amp; Slack
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
        no message content is ever sent to an AI service. It's only ever held in this browser tab
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
              const urgencyStyle = URGENCY_STYLES[item.urgency];
              return (
                <li
                  key={`${item.source}:${item.ref}`}
                  className={`rounded-lg border-l-4 bg-sorted-bg px-3 py-2 text-sm ${urgencyStyle.bar}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${urgencyStyle.dot}`}
                        title={urgencyStyle.label}
                      />
                      <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-sorted-ink-soft">
                        {SOURCE_LABEL[item.source]}
                      </span>
                      <span className="truncate text-sorted-ink">
                        <strong>{item.from}</strong> — {item.snippet}
                      </span>
                    </div>
                    {item.suggestedType && (
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${CATEGORY_STYLES[item.suggestedType]}`}
                      >
                        {TASK_TYPE_LABELS[item.suggestedType]}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <button onClick={() => handleSort(item)} className="font-medium text-sorted-primary hover:underline">
                      Sort it
                    </button>
                    {item.source === "gmail" && (
                      <a
                        className="font-medium text-sorted-amber hover:underline"
                        href={buildMailtoDraft({
                          subject: item.subject ?? item.snippet,
                          suggestedType: item.suggestedType,
                          senderName: item.from,
                        })}
                      >
                        Draft reply
                      </a>
                    )}
                    <span className="ml-auto text-sorted-ink-soft/70">{timeAgo(item.timestamp)}</span>
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
