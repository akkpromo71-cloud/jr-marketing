import type { ReactNode } from 'react';

// Примитивы раскладки «ведомости» (REDESIGN_PLAN.md §2.2). Держим их
// намеренно тонкими — это обёртки над Tailwind-классами, а не абстракция
// со своей логикой. Серверные компоненты (без 'use client'), чтобы их можно
// было использовать прямо в серверных страницах App Router.

// Центрированный контейнер страницы. width='text' — узкая мера для чтения
// (≤42rem), 'wide' и 'default' — основная сетка (72rem).
export function Container({
  children,
  width = 'default',
  className = '',
}: {
  children: ReactNode;
  width?: 'default' | 'wide' | 'text';
  className?: string;
}) {
  const max = width === 'text' ? 'max-w-container-text' : 'max-w-container';
  return <div className={`mx-auto w-full ${max} px-6 ${className}`}>{children}</div>;
}

// 12-колоночная сетка. На мобиле — одна колонка (аудитория преимущественно
// мобильная), с md: раскрывается в 12 колонок. Спаны на детях задаются
// обычными классами col-span-* / md:col-span-* / md:col-start-*.
export function Grid({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-x-gutter gap-y-10 md:grid-cols-12 ${className}`}>
      {children}
    </div>
  );
}

// Горизонтальная линейка во всю ширину родителя — основной разделитель
// секций на лендинге вместо рамок-карточек.
export function Rule({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`h-px w-full bg-border ${className}`} />;
}

// Секция «в край экрана». Внутрь обычно кладут свой Container с боковыми
// полями. bg/border задаются классами на этом же элементе через className.
export function FullBleed({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`full-bleed ${className}`}>{children}</div>;
}
