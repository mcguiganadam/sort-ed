/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Renamed from the old "park-*" tokens left over from "Park It".
        // Same warm, calm palette — sage green reads supportive rather than
        // corrective, cream paper background keeps it soft rather than
        // clinical. amber is reserved for the one "optional, human" action
        // (Ko-fi) so it never competes with the primary green actions.
        sorted: {
          bg: "#faf7f2",
          card: "#ffffff",
          ink: "#1f2a24",
          "ink-soft": "#5b665f",
          leaf: "#3f6b4f",
          "leaf-dark": "#2b4d38",
          "leaf-soft": "#e8efe9",
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
