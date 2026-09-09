'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

// FAQ-аккордеон как блок доверия: крупные пронумерованные вопросы, плавное
// раскрытие через grid-template-rows 0fr→1fr (чистый CSS-переход, без скачка
// высоты), номер и «+» подсвечиваются акцентом на раскрытом. Несколько
// пунктов можно держать открытыми одновременно. prefers-reduced-motion —
// переход отключается (motion-reduce).
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number[]>([]);

  const toggle = (i: number) =>
    setOpen((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  return (
    <ul className="mt-12 border-t border-border">
      {items.map((item, i) => {
        const isOpen = open.includes(i);
        const num = String(i + 1).padStart(2, '0');
        return (
          <li key={item.q} className="border-b border-border">
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="group grid w-full grid-cols-[2.25rem_1fr_2rem] items-start gap-4 py-6 text-left transition-colors hover:bg-white/[0.015] sm:grid-cols-[3rem_1fr_2.5rem] sm:gap-6 sm:py-7"
            >
              <span
                className={`tabular pt-1 text-sm transition-colors ${
                  isOpen ? 'text-primary' : 'text-text-faint group-hover:text-text-dim'
                }`}
              >
                {num}
              </span>
              <span
                className={`text-[1.0625rem] leading-snug transition-colors sm:text-[1.375rem] ${
                  isOpen ? 'text-text' : 'text-text-dim group-hover:text-text'
                }`}
              >
                {item.q}
              </span>
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 motion-reduce:transition-none ${
                  isOpen
                    ? 'rotate-45 border-primary text-primary'
                    : 'border-border text-text-faint group-hover:border-white/25 group-hover:text-text'
                }`}
              >
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-8 pr-4 text-body-lg text-text-dim sm:pl-[calc(3rem+1.5rem)] sm:pr-10">
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
