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