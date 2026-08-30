'use client';

import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { setLocaleAction } from '@/lib/locale-actions';
import type { Locale } from '@/lib/i18n';

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(() => {
      setLocaleAction(next, pathname);
    });
  }

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-border bg-surface2/40 text-xs font-semibold">
      <button
        type="button"
        onClick={() => switchTo('ru')}
        disabled={isPending}
        aria-current={locale === 'ru'}
        className={`px-2.5 py-1.5 transition disabled:cursor-wait ${
          locale === 'ru' ? 'bg-accent text-on-accent' : 'text-text-dim hover:text-text'
        }`}
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => switchTo('en')}
        disabled={isPending}
        aria-current={locale === 'en'}
        className={`px-2.5 py-1.5 transition disabled:cursor-wait ${
          locale === 'en' ? 'bg-accent text-on-accent' : 'text-text-dim hover:text-text'
        }`}
      >
        EN
      </button>
    </div>
  );
}
