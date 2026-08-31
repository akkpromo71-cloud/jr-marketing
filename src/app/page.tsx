import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { Nav } from '@/components/nav';
import { Card } from '@/components/ui';
import { Reveal } from '@/components/reveal';
import { getDict } from '@/lib/i18n';

export default async function LandingPage() {
  const profile = await getCurrentProfile();

  if (profile) redirect(roleHome(profile.role));

  const { t } = await getDict();

  const highlights = [
    { icon: '🎯', title: t.landing.highlight1Title, text: t.landing.highlight1Text },
    { icon: '📈', title: t.landing.highlight2Title, text: t.landing.highlight2Text },
    { icon: '🤝', title: t.landing.highlight3Title, text: t.landing.highlight3Text },
  ];

  const steps = [
    { num: '01', title: t.landing.step1Title, text: t.landing.step1Text },
    { num: '02', title: t.landing.step2Title, text: t.landing.step2Text },
    { num: '03', title: t.landing.step3Title, text: t.landing.step3Text },
  ];

  return (
    <>
      <Nav />
      <main>
        {/* Hero — крупный заголовок, мягкое свечение фона и лёгкий "дрейф" пятен вместо
            статичной картинки: .animate-float-a/b объявлены в globals.css. */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-[-220px] h-[560px] w-[560px] -translate-x-1/2 animate-float-a rounded-full bg-accent/25 blur-[130px]" />
            <div className="absolute right-[-140px] top-[140px] h-[380px] w-[380px] animate-float-b rounded-full bg-accent2/20 blur-[110px]" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-28">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-tint-bg px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-accent">
                {t.landing.kicker}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-text sm:text-6xl">
                {t.landing.heroTitle}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-dim sm:text-lg">
                {t.landing.heroSubtitle}
              </p>
            </Reveal>
          </div>
        </section>

        {/* Карточки ролей — вход в регистрацию для эдитора и артиста */}
        <section className="relative mx-auto max-w-5xl px-6 pb-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <Reveal>
              <Card className="group relative h-full overflow-hidden p-8 hover:-translate-y-1 hover:border-accent/40 hover:shadow-accent">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl transition group-hover:bg-accent/25" />
                <div className="relative flex flex-col gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-tint-bg text-xl transition duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    ✂️
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                    {t.landing.editorTag}
                  </span>
                  <h2 className="font-display text-2xl font-medium text-text">{t.landing.editorTitle}</h2>
                  <p className="text-sm leading-relaxed text-text-dim">{t.landing.editorText}</p>
                  <div className="mt-2 flex gap-3">
                    <Link
                      href="/signup/editor"
                      className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-accent transition hover:-translate-y-0.5 hover:brightness-105 active:scale-95"
                    >
                      {t.landing.registerBtn}
                    </Link>
                    <Link
                      href="/login"
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text-dim transition hover:text-text active:scale-95"
                    >
                      {t.landing.loginBtn}
                    </Link>
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={100}>
              <Card className="group relative h-full overflow-hidden p-8 hover:-translate-y-1 hover:border-accent/40 hover:shadow-accent">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl transition group-hover:bg-accent/25" />
                <div className="relative flex flex-col gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-tint-bg text-xl transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                    🎵
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                    {t.landing.artistTag}
                  </span>
                  <h2 className="font-display text-2xl font-medium text-text">{t.landing.artistTitle}</h2>
                  <p className="text-sm leading-relaxed text-text-dim">{t.landing.artistText}</p>
                  <div className="mt-2 flex gap-3">
                    <Link
                      href="/signup/artist"
                      className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-accent transition hover:-translate-y-0.5 hover:brightness-105 active:scale-95"
                    >
                      {t.landing.registerBtn}
                    </Link>
                    <Link
                      href="/login"
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text-dim transition hover:text-text active:scale-95"
                    >
                      {t.landing.loginBtn}
                    </Link>
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* Три честных преимущества площадки — без выдуманной статистики */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-5 sm:grid-cols-3">
            {highlights.map((h, i) => (
              <Reveal key={h.title} delay={i * 90}>
                <Card className="group h-full p-6 hover:-translate-y-1 hover:border-accent/40">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint-bg text-lg transition duration-300 group-hover:scale-110">
                    {h.icon}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-medium text-text">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-dim">{h.text}</p>
                  <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-surface2">
                    <div className="h-full w-full origin-left scale-x-75 rounded-full bg-gradient-to-r from-accent to-accent2 transition-transform duration-500 group-hover:scale-x-100" />
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Как это работает — три шага, отражающие текущую модель (админ ведёт кампанию) */}
        <section className="mx-auto max-w-5xl px-6 py-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium text-text sm:text-4xl">
                {t.landing.howItWorksTitle}
              </h2>
              <p className="mt-3 text-sm text-text-dim sm:text-base">{t.landing.howItWorksSubtitle}</p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.num} delay={i * 90}>
                <div>
                  <span className="font-display text-4xl font-medium text-accent/40">{s.num}</span>
                  <h3 className="mt-3 font-display text-lg font-medium text-text">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-dim">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Финальный призыв к действию перед контактами */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <Reveal>
            <Card className="relative overflow-hidden px-8 py-14 text-center">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 animate-float-c rounded-full bg-accent/15 blur-[100px]" />
              <div className="relative">
                <h2 className="font-display text-3xl font-medium text-text sm:text-4xl">
                  {t.landing.finalCtaTitle}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-text-dim sm:text-base">
                  {t.landing.finalCtaSubtitle}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/signup/artist"
                    className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-on-accent shadow-accent transition hover:-translate-y-0.5 hover:brightness-105 active:scale-95"
                  >
                    {t.landing.artistTag}
                  </Link>
                  <Link
                    href="/signup/editor"
                    className="rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-text-dim transition hover:border-accent/50 hover:text-text active:scale-95"
                  >
                    {t.landing.editorTag}
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        </section>

        {/* Контакты */}
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 pb-20">
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
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-dim transition hover:-translate-y-0.5 hover:border-accent/50 hover:text-text"
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
