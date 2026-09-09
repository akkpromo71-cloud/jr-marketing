import Link from 'next/link';
import type { ReactNode } from 'react';
import { getDict } from '@/lib/i18n';

// Общий каркас страниц входа/регистрации: полноэкранный сплит 5/7.
// Слева — тёмная брендовая панель с акцентным кантом (magenta + blue —
// две стороны площадки), справа — сама форма. Никаких сплошных цветных
// заливок: тёмная тема на весь сайт (design-system/jr-marketing).
// Серверный компонент: getDict() читает cookie локали.
export async function AuthShell({
  title,
  subtitle,
  brandLine,
  backHref,
  children,
}: {
  title: string;
  subtitle: string;
  brandLine: string;
  backHref: string;
  children: ReactNode;
}) {
  const { t } = await getDict();

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-12">
      <aside className="relative flex flex-col justify-between gap-10 overflow-hidden border-b border-border bg-surface px-6 py-8 md:col-span-5 md:border-b-0 md:border-r md:px-10 md:py-12">
        {/* Ночной vignette — единственный разрешённый градиент. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 80% at 15% 0%, rgba(37,99,235,0.10), transparent 60%)',
          }}
        />
        {/* Кант из двух цветов сторон. */}
        <div aria-hidden="true" className="absolute inset-y-0 left-0 flex w-[3px] flex-col md:w-[3px]">
          <span className="flex-1 bg-primary" />
          <span className="flex-1 bg-accent" />
        </div>

        <Link
          href="/"
          className="relative text-title text-text transition hover:opacity-70"
        >
          J/R marketing
        </Link>
        <p className="relative hidden text-balance break-words text-headline text-text md:block">
          {brandLine}
        </p>
        <div className="relative hidden md:block">
          <div
            aria-hidden="true"
            className="h-px w-32 bg-[image:var(--gradient-iridescent-fade)]"
          />
          <p className="mt-4 text-meta text-text-faint">{t.common.earlyAccess}</p>
        </div>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 md:col-span-7 md:px-16">
        <div className="w-full max-w-container-text">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-meta text-text-faint transition hover:text-text"
          >
            <span aria-hidden="true">&larr;</span>
            {t.common.back}
          </Link>
          <h1 className="mt-6 text-headline text-text">{title}</h1>
          <p className="mt-2 text-body text-text-dim">{subtitle}</p>
          <div className="mt-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
