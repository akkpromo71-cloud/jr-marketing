'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle({ label = 'Переключить тему' }: { label?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
    const prefersDark =
      stored === 'dark' ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface2/40 text-text-dim hover:text-text transition"
    >
      {dark ? '☾' : '☀'}
    </button>
  );
}
