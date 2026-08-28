/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        park: {
          bg: "#faf7f2",
          ink: "#1f2a24",
          leaf: "#3f6b4f",
          leafdark: "#2b4d38",
          amber: "#d98a3d",
        },
      },
    },
  },
  plugins: [],
};
