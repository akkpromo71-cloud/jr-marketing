import type { ReactNode } from 'react';

// Примитивы режима «инструмент» (кабинет клиппера/заказчика, админка) —
// см. design-system/jr-marketing/MASTER.md. Отдельно от ui.tsx («витрина»):
// здесь нет Unbounded, нет pop-in анимаций, числа — JetBrains Mono
// (Tailwind-класс font-mono) с табличным начертанием. Как и ui.tsx, без
// 'use client' и без импорта '@/lib/i18n' — используется прямо в серверных
// страницах и совместимо с клиентскими компонентами.

// Единственная главная цифра экрана (баланс клиппера, доставленные просмотры
// заказчика) — крупная, моноширинная. Всё остальное на экране мельче.
export function ToolStat({
  value,
  label,
  size = 'lg',
}: {
  value: ReactNode;
  label: string;
  size?: 'lg' | 'md';
}) {
  return (
    <div>
      <p
        className={`font-mono font-medium tabular-nums text-text ${
          size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-meta text-text-faint">{label}</p>
    </div>
  );
}

// Второстепенная цифра рядом с главной — тоже моно, но заметно мельче.
export function ToolFigure({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <p className="font-mono text-lg tabular-nums text-text">{value}</p>
      <p className="mt-0.5 text-micro uppercase text-text-faint">{label}</p>
    </div>
  );
}

// Плотная таблица данных вместо карточек — список работ/начислений/выводов.
export function ToolTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="tool-table">{children}</table>
    </div>
  );
}

export function ToolEmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-6 text-center text-text-faint">
        {text}
      </td>
    </tr>
  );
}

// Секция экрана в режиме «инструмент»: заголовок — Manrope (не Unbounded),
// отступ вдвое меньше, чем на витрине.
export function ToolSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-6 ${className}`}>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
