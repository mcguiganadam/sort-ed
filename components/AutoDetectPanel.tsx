"use client";

// components/AutoDetectPanel.tsx
//
// Single merged feed of recent Gmail + Slack activity that looks sortable,
// interleaved by recency, each item colour-coded twice: an urgency bar
// (red/amber/green, keyword-based — see lib/heuristics.ts scoreUrgency)
// and a category badge (pastoral/inclusion/parent/etc.). The default
// "who/what" summary line is built locally from data already fetched for
// classification — nothing is sent to a third-party model API.
//
// An OPT-IN toggle additionally offers real AI summarisation via a small
// model run entirely on-device (lib/localAI.ts, WebGPU/WebLLM) — off by
// default since it downloads model weights on first use. Even when on,
// nothing leaves this browser tab: the model runs locally and the network
// is never involved in producing a summary.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { sortTask, TaskType } from "@/lib/db";
import { buildMailtoDraft } from "@/lib/mailto";
import { TASK_TYPE_LABELS } from "@/lib/templates";
import { Urgency } from "@/lib/heuristics";
import { isLocalAIAvailable, loadLocalAI, summarizeWithLocalAI, unloadLocalAI } from "@/lib/localAI";
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

type AIStatus = "idle" | "loading" | "ready" | "error";

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

  // On-device AI summarisation — opt-in, see lib/localAI.ts.
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>("idle");
  const [aiProgressText, setAiProgressText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [aiSummarizing, setAiSummarizing] = useState<Set<string>>(new Set());

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
    setDismissed((prev) => new Set(prev).add(itemKey(item)));
    onSorted();
  }

  async function handleToggleAI() {
    if (aiEnabled) {
      setAiEnabled(false);
      setAiStatus("idle");
      setAiSummaries({});
      unloadLocalAI().catch(() => {
        // best-effort cleanup; nothing to surface to the teacher if this fails
      });
      return;
    }
    if (!isLocalAIAvailable()) {
      setAiError("This browser doesn't support on-device AI (needs WebGPU — try a recent Chrome or Edge).");
      setAiStatus("error");
      return;
    }
    setAiEnabled(true);
    setAiStatus("loading");
    setAiError(null);
    setAiProgressText("");
    try {
      await loadLocalAI((report) => setAiProgressText(report.text));
      setAiStatus("ready");
    } catch (err) {
      setAiStatus("error");
      setAiError(err instanceof Error ? err.message : "Couldn't load the on-device model.");
      setAiEnabled(false);
    }
  }

  // Once the on-device model is ready, summarise any visible items that
  // don't have an AI summary yet — one at a time, in the background, so
  // the feed fills in progressively rather than blocking on a big batch.
  useEffect(() => {
    if (!aiEnabled || aiStatus !== "ready" || !items) return;
    const pending = items.filter((i) => !(itemKey(i) in aiSummaries) && !aiSummarizing.has(itemKey(i)));
    if (pending.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const item of pending) {
        if (cancelled) break;
        const key = itemKey(item);
        setAiSummarizing((prev) => new Set(prev).add(key));
        try {
          const summary = await summarizeWithLocalAI({ from: item.from, subject: item.subject, body: item.raw });
          if (!cancelled) setAiSummaries((prev) => ({ ...prev, [key]: summary }));
        } catch {
          // on-device summarising failed for this item — the heuristic snippet stays as the fallback
        } finally {
          if (!cancelled) {
            setAiSummarizing((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run whenever a fresh scan brings in items this hasn't summarised yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, aiEnabled, aiStatus]);

  const visibleItems = items?.filter((i) => !dismissed.has(itemKey(i))) ?? [];
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
        no message content is sent anywhere by default. It's only ever held in this browser tab
        while you decide what to sort.
      </p>

      {anyConnected && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <label className="inline-flex cursor-pointer select-none items-center gap-1.5">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={handleToggleAI}
              className="h-3.5 w-3.5 rounded border-sorted-border"
            />
            <span className="text-sorted-ink-soft">
              On-device AI summaries — model runs in this browser, nothing is sent to a server
            </span>
          </label>
          {aiStatus === "loading" && (
            <span className="text-sorted-ink-soft/70">
              Downloading a small AI model to this browser (one-time, ~1GB)… {aiProgressText}
            </span>
          )}
          {aiStatus === "error" && aiError && <span className="text-red-600">{aiError}</span>}
        </div>
      )}

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
              const key = itemKey(item);
              const aiSummary = aiSummaries[key];
              const isSummarizing = aiEnabled && aiStatus === "ready" && aiSummarizing.has(key);
              const displaySnippet = aiSummary ?? item.snippet;

              return (
                <li
                  key={key}
                  className={`overflow-hidden rounded-lg border-l-4 bg-sorted-bg px-3 py-2 text-sm ${urgencyStyle.bar}`}
                >
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
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${urgencyStyle.dot}`}
                      title={urgencyStyle.label}
                    />
                    <span className="shrink-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-sorted-ink-soft">
                      {SOURCE_LABEL[item.source]}
                    </span>
                    {aiSummary && (
                      <span
                        className="shrink-0 whitespace-nowrap rounded-full bg-sorted-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-sorted-primary-dark"
                        title="Summarised on-device"
                      >
                        AI
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sorted-ink">
                      <strong>{item.from}</strong> — {isSummarizing ? "Summarising…" : displaySnippet}
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
