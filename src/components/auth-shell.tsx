import Link from 'next/link';
import type { ReactNode } from 'react';
import { getDict } from '@/lib/i18n';

// Общий каркас страниц входа/регистрации (REDESIGN_PLAN.md §6): полноэкранный
// сплит 5/7. Слева — чёрная брендовая панель (на мобиле схлопывается в узкую
// полосу с вордмарком), справа — сама форма без обёртки-Card, на новой
// типографической шкале. Серверный компонент: getDict() читает cookie локали.
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
      <aside className="flex flex-col justify-between gap-10 bg-accent px-6 py-8 text-on-accent md:col-span-5 md:px-10 md:py-12">
        <Link href="/" className="text-title text-on-accent transition hover:opacity-70">
          J/R marketing
        </Link>
        <p className="hidden text-display-sm md:block">{brandLine}</p>
        <div className="hidden md:block">
          <div
            aria-hidden="true"
            className="h-px w-32 bg-[image:var(--gradient-iridescent-fade)]"
          />
          <p className="mt-4 text-meta text-on-accent/60">{t.common.earlyAccess}</p>
        </div>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 md:col-span-7 md:px-16">
        <div className="w-full max-w-container-text">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-meta text-text-faint transition hover:text-text"
          >
            <span aria-hidden="true">←</span>
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
