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
        background: "#000000",
        surface: {
          DEFAULT: "#0C0C0E",
          raised: "#16161A",
        },
        border: {
          DEFAULT: "#222226",
        },
        accent: {
          DEFAULT: "#FFFFFF",
          muted: "#52525B",
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        text: {
          primary: "#FFFFFF",
          secondary: "#A1A1AA",
          muted: "#52525B",
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
