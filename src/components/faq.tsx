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
    <ul className="mt-8 border-t border-border sm:mt-12">
      {items.map((item, i) => {
        const isOpen = open.includes(i);
        const num = String(i + 1).padStart(2, '0');
        return (
          <li key={item.q} className="border-b border-border">
            {/* Сетка: номер | вопрос (1fr) | «+». «+» в последней колонке —
                все плюсы выстроены в одну вертикаль у правого края строки. */}
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="group grid w-full grid-cols-[1.75rem_1fr_2rem] items-start gap-3 py-5 text-left transition-colors hover:bg-white/[0.015] sm:grid-cols-[2.5rem_1fr_2.25rem] sm:gap-5 sm:py-6"
            >
              <span
                className={`pt-1 text-sm tabular transition-colors ${
                  isOpen ? 'text-text' : 'text-text-faint group-hover:text-text-dim'
                }`}
              >
                {num}
              </span>
              <span
                className={`text-[1.0625rem] leading-snug transition-colors sm:text-[1.3rem] ${
                  isOpen ? 'text-text' : 'text-text-dim group-hover:text-text'
                }`}
              >
                {item.q}
              </span>
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded border transition-all duration-300 motion-reduce:transition-none sm:size-8 ${
                  isOpen
                    ? 'rotate-45 border-white/40 text-text'
                    : 'border-border text-text-faint group-hover:border-white/25 group-hover:text-text'
                }`}
              >
                <Plus size={15} strokeWidth={2} aria-hidden="true" />
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-7 pr-4 text-body-lg text-text-dim sm:pl-[3.75rem]">
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
