/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Add this line
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        factory: {
          /* LRBC brand palette (matches lrbc.ai) - deep violet-charcoal */
          dark: '#140f23',
          surface: '#1d1633',
          accent: '#8b5cf6',
          success: '#10b981'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}