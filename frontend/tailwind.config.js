/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0F",
        surface: {
          DEFAULT: "#13131A",
          raised: "#1C1C26",
        },
        border: {
          DEFAULT: "#2A2A38",
        },
        accent: {
          DEFAULT: "#6C63FF",
          muted: "#3D3A6B",
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        text: {
          primary: "#F0F0F5",
          secondary: "#8888AA",
          muted: "#55556A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
}
