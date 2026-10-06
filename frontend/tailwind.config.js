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
        background: "#0A0B0E",
        surface: {
          DEFAULT: "#121318",
          raised: "#181920",
          card: "#14151C",
        },
        pastel: {
          mint: "#D4EFE6",
          lavender: "#ECEBFB",
          peach: "#FDECE8",
          cream: "#F8F9FA",
          ink: "#111317",
        },
        border: {
          DEFAULT: "#1F2027",
        },
        accent: {
          DEFAULT: "#FFFFFF",
          muted: "#71717A",
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        text: {
          primary: "#FFFFFF",
          secondary: "#9496A1",
          muted: "#525462",
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
