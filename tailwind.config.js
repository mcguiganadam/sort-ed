/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
