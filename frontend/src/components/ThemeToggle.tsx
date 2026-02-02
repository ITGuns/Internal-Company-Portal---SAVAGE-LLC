"use client";

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // apply theme to document and persist
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // respond to system changes while mounted
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const savedPref = localStorage.getItem('theme');
      if (!savedPref) setTheme(e.matches ? 'dark' : 'light');
    };
    if (mql && 'addEventListener' in mql) mql.addEventListener('change', handler as EventListener);
    else if (mql && 'addListener' in mql) (mql as MediaQueryList).addListener(handler as unknown as EventListener);
    return () => {
      if (mql && 'removeEventListener' in mql) mql.removeEventListener('change', handler as EventListener);
      else if (mql && 'removeListener' in mql) (mql as MediaQueryList).removeListener(handler as unknown as EventListener);
    };
  }, []);

  // cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue as 'light' | 'dark');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      aria-label="Toggle theme"
      aria-pressed={isDark}
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      className="p-2 rounded-md bg-white/5 dark:bg-white/10 hover:bg-white/10 dark:hover:bg-white/20 transition-colors"
    >
      {isDark ? (
        <Moon className="w-5 h-5 text-white" />
      ) : (
        <Sun className="w-5 h-5 text-yellow-400" />
      )}
    </button>
  );
}
