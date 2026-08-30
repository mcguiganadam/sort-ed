/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/heuristics.ts builds Tailwind class strings (URGENCY_STYLES'
    // bar/dot/pill/box) that components only ever reference dynamically
    // (e.g. `${style.box}`) — Tailwind's JIT can't see through that
    // interpolation, so it only generated CSS for a class if the exact
    // same literal string happened to also appear somewhere already
    // scanned. That's why the "Next"/orange box worked (KofiButton.tsx
    // independently uses the identical "border-sorted-amber/30
    // bg-sorted-amber-soft" string) while "Urgent" (red) and "Later"
    // (green) rendered with no colour at all — their box classes had no
    // such lucky duplicate anywhere in app/ or components/. Scanning
    // lib/ too means every class defined there gets generated for real,
    // regardless of what else happens to reference it.
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modernist first-run redesign tokens (design handoff,
        // 2026-08-30: "Teacher-Friendly First-Run Experience"). Flat,
        // architectural system -- zero border-radius anywhere (no
        // `rounded` utility is used against these), 2px divider rules
        // instead of card borders/shadows. Kept as its own `flat`
        // namespace rather than overwriting `sorted.*` below, since only
        // app/page.tsx and the dashboard cards (TaskCapture,
        // TodaySchedule, AutoDetectPanel, SortedList) adopt it -- other
        // pages (e.g. /privacy) keep the original brand look.
        flat: {
          bg: "#f3f2f2",
          text: "#201e1d",
          // color-mix() has solid support in every browser this app
          // already targets (Chrome/Edge 111+, Safari 16.4+, Firefox
          // 113+) -- used directly rather than pre-computing a flat hex,
          // so it stays correct if the background or text color above
          // ever changes.
          divider: "color-mix(in srgb, #201e1d 40%, transparent)",
          "divider-soft": "color-mix(in srgb, #201e1d 30%, transparent)",
          "divider-mid": "color-mix(in srgb, #201e1d 35%, transparent)",
          // Accent (brand, non-urgent) ramp -- ovirrides the underlying
          // Modernist system's default red accent per the handoff's
          // explicit note: red is reserved for the Urgent state only.
          accent: "#2f5a8a",
          "accent-100": "#eaf1fa",
          "accent-700": "#24405f",
          // Urgent/Next keep their own explicit colors (not part of the
          // accent ramp) -- Later reuses the accent ramp above.
          urgent: "#ec3013",
          "urgent-bg": "#fff2ef",
          "urgent-heading": "#ae1800",
          next: "#b45309",
          "next-bg": "#fffbeb",
        },
        sorted: {
          bg: "#faf7f2",
          card: "#ffffff",
          ink: "#1f2a24",
          "ink-soft": "#5b665f",
          // Main action colour — blue. Buttons, links, the wordmark, focus
          // rings all live here.
          primary: "#3f5f8a",
          "primary-dark": "#2a4160",
          "primary-soft": "#e7edf6",
          // Reserved for the future triage feature — not used in any
          // component yet. Kept as its own token (rather than deleted) so
          // it's ready to switch on later without re-deriving the palette.
          triage: "#3f6b4f",
          "triage-dark": "#2b4d38",
          "triage-soft": "#e8efe9",
          amber: "#d98a3d",
          "amber-soft": "#fbead9",
          border: "#e3ddd0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-rounded", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Archivo -- Modernist first-run redesign (app/page.tsx + the
        // dashboard cards) only. Deliberately a separate token from
        // `display`/`sans` above rather than replacing them, since this
        // font swap is scoped to the landing/dashboard page per the
        // design handoff ("first-run experience"), not the whole site --
        // /privacy and any future page keep Quicksand/Inter.
        modernist: ["var(--font-modernist)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,42,36,0.04), 0 4px 16px rgba(31,42,36,0.05)",
        "card-hover": "0 2px 4px rgba(31,42,36,0.06), 0 8px 24px rgba(31,42,36,0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
