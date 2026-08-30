import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { Nav } from '@/components/nav';
import { Card } from '@/components/ui';
import { getDict } from '@/lib/i18n';

export default async function LandingPage() {
  const profile = await getCurrentProfile();

  if (profile) redirect(roleHome(profile.role));

  const { t } = await getDict();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-medium leading-tight text-text sm:text-5xl">
            {t.landing.heroTitle}
          </h1>
          <p className="mt-5 text-base text-text-dim">{t.landing.heroSubtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <Card className="flex flex-col gap-4 p-8">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              {t.landing.editorTag}
            </span>
            <h2 className="font-display text-2xl font-medium text-text">{t.landing.editorTitle}</h2>
            <p className="text-sm text-text-dim">{t.landing.editorText}</p>
            <div className="mt-2 flex gap-3">
              <Link
                href="/signup/editor"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-accent"
              >
                {t.landing.registerBtn}
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text-dim hover:text-text transition"
              >
                {t.landing.loginBtn}
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-8">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              {t.landing.artistTag}
            </span>
            <h2 className="font-display text-2xl font-medium text-text">{t.landing.artistTitle}</h2>
            <p className="text-sm text-text-dim">{t.landing.artistText}</p>
            <div className="mt-2 flex gap-3">
              <Link
                href="/signup/artist"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-accent"
              >
                {t.landing.registerBtn}
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text-dim hover:text-text transition"
              >
                {t.landing.loginBtn}
              </Link>
            </div>
          </Card>
        </div>

        <div className="mt-16 flex flex-col items-center gap-4">
          <span className="text-xs text-text-faint">{t.landing.contactLabel}</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: t.landing.instagram, href: null },
              { label: t.landing.telegramChannel, href: 'https://t.me/jrmrktng' },
              { label: t.landing.tiktok, href: null },
            ].map(({ label, href }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                >
                  {label}
                </a>
              ) : (
                <span
                  key={label}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-dim"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      </main>
    </>
  );
}
