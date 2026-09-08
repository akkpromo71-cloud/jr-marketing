'use client';

import { useEffect, useRef } from 'react';

// Авторский motion-жест сайта (REDESIGN_PLAN.md §3, «текстовый reveal на hero»
// из списка вариантов брифа): дисплейный заголовок хиро проявляется словами
// снизу вверх с лёгким каскадом — ОДИН раз, при первой отрисовке. Ничего не
// анимируется постоянно (важно для мобильной аудитории и слабых устройств).
//
// Прогрессивное улучшение: базово слова просто видны (SSR-разметка = полный
// заголовок обычными <span>). Класс data-armed навешивается на клиенте сразу
// после монтирования и запускает разовую CSS-анимацию (см. globals.css).
// prefers-reduced-motion: reduce → анимации нет, текст сразу на месте.
export function HeroReveal({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(' ');
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    ref.current?.setAttribute('data-armed', 'true');
  }, []);

  return (
    <h1 ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i}>
          <span className="hero-word" style={{ ['--hero-word-delay' as string]: `${i * 55}ms` }}>
            {word}
          </span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </h1>
  );
}
