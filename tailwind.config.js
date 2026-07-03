/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Texas A&M Maroon palette
        maroon: {
          50: "#fdf2f4",
          100: "#fbe5ea",
          200: "#f5ccd5",
          300: "#eda3b4",
          400: "#e06f8b",
          500: "#cf4267",
          600: "#b32a51",
          700: "#96304a",
          800: "#732338",
          850: "#651a28",
          900: "#5c1828",
          950: "#3d101a",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        "card-hover":
          "0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(245,158,11,0.5)" },
          "70%": { boxShadow: "0 0 0 6px rgba(245,158,11,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(245,158,11,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};
