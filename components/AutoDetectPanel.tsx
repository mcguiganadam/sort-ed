"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { parkTask } from "@/lib/db";
import { buildMailtoDraft } from "@/lib/mailto";
import { TASK_TYPE_LABELS } from "@/lib/templates";

interface DetectedItem {
  ref: string;
  from: string;
  snippet: string;
  suggestedType: any;
  suggestedInitials: string;
}

function SourceBlock({
  label,
  connected,
  provider,
  endpoint,
  onParked,
}: {
  label: string;
  connected: boolean;
  provider: "google" | "slack";
  endpoint: string;
  onParked: () => void;
}) {
  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function scan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not scan.");
        setItems([]);
      } else {
        setItems(json.items ?? []);
      }
    } catch {
      setError("Network error while scanning.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePark(item: DetectedItem) {
    if (!item.suggestedType) return;
    await parkTask({
      taskType: item.suggestedType,
      initialCapture: `${item.suggestedInitials} — via ${label}`,
      source: provider === "google" ? "gmail" : "slack",
      sourceRef: item.ref,
    });
    setDismissed((prev) => new Set(prev).add(item.ref));
    onParked();
  }

  if (!connected) {
    return (
      <div className="rounded-xl border border-dashed border-sorted-border p-4 text-sm text-sorted-leaf-dark">
        <p className="mb-2">{label} isn't connected yet — nothing is read until you sign in.</p>
        <button
          onClick={() => signIn(provider)}
          className="rounded-full bg-sorted-leaf px-3 py-1 text-sm font-medium text-white transition hover:bg-sorted-leaf-dark"
        >
          Connect {label}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sorted-border bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-sorted-leaf-dark">{label}</h3>
        <button
          onClick={scan}
          disabled={loading}
          className="text-xs font-medium text-sorted-leaf underline decoration-dotted hover:text-sorted-leaf-dark"
        >
          {loading ? "Scanning…" : "Scan recent activity"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {items && items.length === 0 && !error && (
        <p className="mt-2 text-xs text-sorted-ink-soft">Nothing that looks parkable right now.</p>
      )}
      <ul className="mt-3 space-y-2">
        {items
          ?.filter((i) => !dismissed.has(i.ref))
          .map((item) => (
            <li key={item.ref} className="rounded-lg bg-sorted-bg px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sorted-ink">
                  <strong>{item.from}</strong> — {item.snippet}
                </span>
                {item.suggestedType && (
                  <span className="whitespace-nowrap rounded-full bg-sorted-leaf-soft px-2 py-0.5 text-xs text-sorted-leaf-dark">
                    {TASK_TYPE_LABELS[item.suggestedType as keyof typeof TASK_TYPE_LABELS]}
                  </span>
                )}
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <button onClick={() => handlePark(item)} className="font-medium text-sorted-leaf hover:underline">
                  Park it
                </button>
                {provider === "google" && (
                  <a
                    className="font-medium text-sorted-amber hover:underline"
                    href={buildMailtoDraft({
                      subject: item.snippet,
                      suggestedType: item.suggestedType,
                      senderName: item.from,
                    })}
                  >
                    Draft reply
                  </a>
                )}
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

export default function AutoDetectPanel({ onParked }: { onParked: () => void }) {
  const { data: session } = useSession();
  const googleConnected = Boolean((session as any)?.googleConnected);
  const slackConnected = Boolean((session as any)?.slackConnected);

  return (
    <div className="rounded-2xl border border-sorted-border bg-sorted-card p-5 shadow-card">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-sorted-leaf-dark">
        Auto-detect from Gmail &amp; Slack
      </h2>
      <p className="mt-1 text-xs text-sorted-ink-soft">
        Read-only. Nothing scanned here is stored — it's only ever held in this browser tab
        while you decide what to park.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SourceBlock
          label="Gmail"
          connected={googleConnected}
          provider="google"
          endpoint="/api/gmail/scan"
          onParked={onParked}
        />
        <SourceBlock
          label="Slack"
          connected={slackConnected}
          provider="slack"
          endpoint="/api/slack/scan"
          onParked={onParked}
        />
      </div>
    </div>
  );
}
