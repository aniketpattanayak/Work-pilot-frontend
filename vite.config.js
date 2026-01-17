/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))", // Maps the 'border' utility to your CSS variable
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        factory: {
          dark: '#020617',
          surface: '#0f172a',
          accent: '#38bdf8',
          success: '#10b981'
        }
      }
    },
  },
  plugins: [],
}