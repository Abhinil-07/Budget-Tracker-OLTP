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
        background: "#09090B",
        surface: {
          DEFAULT: "#121215",
          raised: "#18181B",
        },
        border: {
          DEFAULT: "#27272A",
        },
        accent: {
          DEFAULT: "#CCFF00",
          muted: "#84A300",
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        text: {
          primary: "#FAFAFA",
          secondary: "#9CA3AF",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
}
