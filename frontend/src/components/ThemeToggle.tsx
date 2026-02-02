"use client";

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) setTheme(saved);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');

    // respond to system changes while mounted
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // only follow system if user hasn't explicitly saved a preference
      const savedPref = localStorage.getItem('theme');
      if (!savedPref) setTheme(e.matches ? 'dark' : 'light');
    };
    if (mql && mql.addEventListener) mql.addEventListener('change', handler);
    else if (mql && mql.addListener) mql.addListener(handler);

    return () => {
      if (mql && mql.removeEventListener) mql.removeEventListener('change', handler as any);
      else if (mql && mql.removeListener) mql.removeListener(handler as any);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

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

  if (!mounted) return null;

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
