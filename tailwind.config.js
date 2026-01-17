/** @type {import('tailwindcss').Config} */
export default {
  // CRITICAL: Enables class-based dark mode for the .dark class in index.css
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* SEMANTIC TOKENS: These handle the automatic Light/Dark switching */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        /* INDUSTRIAL BRAND PALETTE: Kept for specific hardcoded branding needs */
        factory: {
          dark: '#020617',
          surface: '#0f172a',
          accent: '#38bdf8',
          success: '#10b981'
        }
      },
      borderRadius: {
        'factory': '1.5rem',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
}