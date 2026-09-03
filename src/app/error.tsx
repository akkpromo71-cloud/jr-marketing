'use client';

import { useEffect, useState } from 'react';
import { Card, Button, LinkButton } from '@/components/ui';
import { logError } from '@/lib/log-error';

// Next.js требует, чтобы error.tsx был Client Component (получает error/reset
// как пропсы, reset — интерактивная кнопка) — поэтому здесь нельзя использовать
// async getDict()/Nav, как на остальных страницах (они читают cookie на сервере).
// Локаль подхватываем на клиенте из той же cookie "locale", что и весь сайт —
// после первого рендера, чтобы не ловить hydration mismatch.
const copy = {
  ru: {
    title: 'Что-то пошло не так',
    text: 'Произошла непредвиденная ошибка. Мы уже записали её в лог — попробуйте обновить страницу.',
    retryBtn: 'Попробовать снова',
    backHome: 'На главную',
  },
  en: {
    title: 'Something went wrong',
    text: "An unexpected error occurred. It's been logged — try refreshing the page.",
    retryBtn: 'Try again',
    backHome: 'Back to home',
  },
};

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = useState<'ru' | 'en'>('ru');

  useEffect(() => {
    logError('error.tsx', error, { digest: error.digest });
    const match = document.cookie.match(/(?:^|; )locale=([^;]+)/);
    if (match?.[1] === 'en') setLocale('en');
  }, [error]);

  const t = copy[locale];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <Card className="w-full p-8">
        <p className="text-5xl" aria-hidden="true">
          ⚠️
        </p>
        <h1 className="mt-4 font-display text-2xl font-medium text-text">{t.title}</h1>
        <p className="mt-2 text-sm text-text-dim">{t.text}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            {t.retryBtn}
          </Button>
          <LinkButton href="/" variant="secondary">
            {t.backHome}
          </LinkButton>
        </div>
      </Card>
    </main>
  );
}
