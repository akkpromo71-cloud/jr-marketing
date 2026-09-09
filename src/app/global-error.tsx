'use client';

import { useEffect } from 'react';
import { logError } from '@/lib/log-error';

// Срабатывает только если упал сам корневой layout.tsx (а не обычная
// страница) — в этом случае Next.js подменяет ВЕСЬ документ целиком, поэтому
// здесь нужны свои <html>/<body> и никаких импортов из components/ui —
// если сломался layout, лучше не тянуть за собой ничего, что могло сломаться
// вместе с ним. Простая, максимально независимая аварийная страница.
// lib/log-error.ts — намеренно не серверный модуль (без next/headers и
// подобного), его можно безопасно тянуть даже сюда — см. комментарий в
// самом файле.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError('global-error.tsx', error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#0b0f1a',
          color: '#f4f5f7',
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fb7185"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: 'block', margin: '0 auto' }}
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginTop: 16 }}>
            Сайт временно недоступен
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, opacity: 0.75, lineHeight: 1.5 }}>
            Произошла критическая ошибка. Мы уже записали её в лог — попробуйте
            обновить страницу через пару минут.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '10px 24px',
              borderRadius: 999,
              border: 'none',
              background: '#f5f5f7',
              color: '#0b0b0f',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
