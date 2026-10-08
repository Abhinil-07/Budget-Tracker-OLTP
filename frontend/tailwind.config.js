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
          DEFAULT: "#0B0B0E",
          raised: "#121216",
          card: "#0E0E12",
        },
        border: {
          DEFAULT: "#1C1D22",
        },
        accent: {
          DEFAULT: "#FFFFFF",
          muted: "#71717A",
        },
        success: "#10B981",
        danger: "#F43F5E",
        warning: "#F59E0B",
        text: {
          primary: "#FFFFFF",
          secondary: "#9CA3AF",
          muted: "#52525B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
