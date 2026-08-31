'use client';

import { useEffect, useRef } from 'react';

// Лёгкое пятно света, следующее за курсором внутри родительского блока —
// используется в hero-секции лендинга (родитель должен иметь className
// "group relative"). Слушаем mousemove на parentElement (событие всплывает
// даже с кнопок/текста внутри), показываем через group-hover:opacity-100.
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    function handleMove(e: MouseEvent) {
      const rect = parent!.getBoundingClientRect();
      el!.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
      el!.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
    }

    parent.addEventListener('mousemove', handleMove);
    return () => parent.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 [--mx:50%] [--my:15%] group-hover:opacity-100"
      style={{
        background: 'radial-gradient(460px circle at var(--mx) var(--my), var(--accent-tint-bg), transparent 70%)',
      }}
    />
  );
}
