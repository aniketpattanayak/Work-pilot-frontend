import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="group relative p-3 rounded-2xl bg-card border border-border text-slate-500 dark:text-amber-400 hover:border-primary transition-all duration-500 shadow-sm active:scale-95 overflow-hidden"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      <div className="relative w-5 h-5">
        <div className={`absolute inset-0 transition-all duration-700 ${theme === 'dark' ? 'translate-y-0 opacity-100 rotate-0' : 'translate-y-10 opacity-0 rotate-90'}`}>
          <Sun size={20} />
        </div>
        <div className={`absolute inset-0 transition-all duration-700 ${theme === 'light' ? 'translate-y-0 opacity-100 rotate-0' : '-translate-y-10 opacity-0 -rotate-90'}`}>
          <Moon size={20} className="text-primary" />
        </div>
      </div>
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export default ThemeToggle;