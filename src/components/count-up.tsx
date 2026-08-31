'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCompactNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n';

// Анимированный счётчик числа: считает от 0 до target один раз, когда блок
// попадает во вьюпорт (IntersectionObserver), уважает prefers-reduced-motion.
export function CountUp({
  target,
  locale,
  duration = 1400,
}: {
  target: number;
  locale: Locale;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{formatCompactNumber(value, locale)}</span>;
}
