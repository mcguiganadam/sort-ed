"use client";

// components/UrgencyPicker.tsx
//
// Three dots, red/orange/green — the one time-sensitivity decision a
// teacher makes when sorting anything, whether it's a quick-captured note
// or an auto-detected email. Deliberately not an auto-computed badge: the
// app used to guess this (and a category, and more) on the teacher's
// behalf across several places, which added up to more decision-making to
// untangle than it saved. This is the opposite — one small, always-visible,
// always-changeable control, reused everywhere sorting happens.
import { Urgency, URGENCY_ORDER, URGENCY_STYLES } from "@/lib/heuristics";

export default function UrgencyPicker({
  value,
  onChange,
}: {
  value: Urgency;
  onChange: (u: Urgency) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Time sensitivity">
      {URGENCY_ORDER.map((u) => {
        const style = URGENCY_STYLES[u];
        const selected = value === u;
        return (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={selected}
            title={style.label}
            onClick={() => onChange(u)}
            className={`h-5 w-5 shrink-0 rounded-full transition ${style.dot} ${
              selected ? "ring-2 ring-offset-1 ring-sorted-ink/40" : "opacity-30 hover:opacity-70"
            }`}
          />
        );
      })}
    </div>
  );
}
