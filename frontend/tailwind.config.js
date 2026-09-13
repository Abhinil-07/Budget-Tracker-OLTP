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
        background: "#0A0A0A",
        surface: {
          DEFAULT: "#161616",
          raised: "#1E1E1F",
        },
        border: {
          DEFAULT: "#2A2A2C",
        },
        accent: {
          DEFAULT: "#D97757",
          muted: "#6B3D2E",
        },
        success: "#22C55E",
        danger: "#E5484D",
        warning: "#F59E0B",
        text: {
          primary: "#EDEDEC",
          secondary: "#8C8C8C",
          muted: "#555555",
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
