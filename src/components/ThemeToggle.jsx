import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * THEME TOGGLE: ADAPTIVE COLOR ENGINE
 * Purpose: Manages global theme state and provides a high-fidelity sliding animation.
 * Logic: Synchronizes with OS color schemes and persists choice via localStorage.
 */
const ThemeToggle = () => {
  // Functional initializer to prevent "Flash of Unstyled Content" (FOUC)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    // Default to dark for industrial aesthetic if no preference is found
    return saved || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      // Informs the browser to render native elements (scrollbars/forms) in dark mode
      root.style.colorScheme = 'dark'; 
    } else {
      root.classList.remove('dark');
      // Informs the browser to render native elements in light mode
      root.style.colorScheme = 'light';
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        group relative p-3 rounded-2xl border transition-all duration-500 shadow-sm active:scale-95 overflow-hidden
        ${theme === 'dark' 
          ? 'bg-slate-900 border-slate-800/60 text-amber-400 hover:border-amber-500/50' 
          : 'bg-card border-border text-primary hover:border-primary/50 shadow-md'
        }
      `}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {/* ANIMATION ENGINE: 
          Uses absolute positioning with hidden overflows to create a 'tumbling' transition effect.
      */}
      <div className="relative w-5 h-5 z-10">
        
        {/* --- SUN ICON (Active in Dark Mode to trigger Light) --- */}
        <div 
          className={`absolute inset-0 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${
            theme === 'dark' 
              ? 'translate-y-0 opacity-100 rotate-0 scale-100' 
              : 'translate-y-10 opacity-0 rotate-90 scale-50'
          }`}
        >
          <Sun size={20} className="fill-amber-400/10" />
        </div>
        
        {/* --- MOON ICON (Active in Light Mode to trigger Dark) --- */}
        <div 
          className={`absolute inset-0 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${
            theme === 'light' 
              ? 'translate-y-0 opacity-100 rotate-0 scale-100' 
              : '-translate-y-10 opacity-0 -rotate-90 scale-50'
          }`}
        >
          <Moon size={20} className="text-primary fill-primary/10" />
        </div>
      </div>

      {/* TACTILE GLOW BACKDROP:
          Matches the theme's specific accent color on hover.
      */}
      <div className={`
        absolute inset-0 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none
        ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-primary/20'}
      `} />
      
      <span className="sr-only">Toggle Color Theme</span>
    </button>
  );
};

export default ThemeToggle;