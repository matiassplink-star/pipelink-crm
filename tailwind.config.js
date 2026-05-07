/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb", // Blue 600
          hover: "#1d4ed8",
          light: "#eff6ff",
        },
        accent: "#0ea5e9", // Sky 500
        surface: {
          DEFAULT: "#ffffff",
          alt: "#f8fafc",
          border: "#e2e8f0",
        },
        text: {
          main: "#0f172a", // Slate 900
          muted: "#64748b", // Slate 500
        }
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "card-hover": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};
