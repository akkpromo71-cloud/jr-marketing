import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AudioLines,
  Scissors,
  Users,
  ShieldCheck,
  BadgeCheck,
  Wallet,
  Star,
  ArrowRight,
} from 'lucide-react';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { createClient } from '@/lib/supabase/server';
import { Nav } from '@/components/nav';
import { Container, Grid } from '@/components/layout';
import { LinkButton } from '@/components/ui';
import { HeroReveal } from '@/components/hero-reveal';
import { HeroVisual } from '@/components/hero-visual';
import { Ticker } from '@/components/ticker';
import { Faq } from '@/components/faq';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber } from '@/lib/format';

interface PublicStats {
  completed_edits: number;
  total_views: number;
  active_editors: number;
}

interface LeaderboardRow {
  display_name: string;
  total_views: number;
  total_likes: number;
  completed_count: number;
}

interface PublicReview {
  author_role: 'artist' | 'editor';
  rating: number;
  comment: string | null;
  campaign_title: string;
  created_at: string;
}

export default async function LandingPage() {
  const profile = await getCurrentProfile();

  if (profile) redirect(roleHome(profile.role));

  const { t, locale } = await getDict();
  const supabase = await createClient();

  // Публичные RPC (security definer, доступны анониму). ЗАПРОСЫ НЕ МЕНЯЛИСЬ —
  // перестроен только презентационный слой.
  const [{ data: statsData }, { data: leaderboardData }, { data: reviewsData }] = await Promise.all([
    supabase.rpc('get_public_platform_stats'),
    supabase.rpc('get_editor_leaderboard', { p_limit: 10 }),
    supabase.rpc('get_public_reviews', { p_limit: 6 }),
  ]);

  const stats = (Array.isArray(statsData) ? statsData[0] : statsData) as PublicStats | undefined;
  const leaderboard = (leaderboardData ?? []) as LeaderboardRow[];
  const reviews = (reviewsData ?? []) as PublicReview[];
  const hasStats =
    !!stats && (stats.completed_edits > 0 || stats.total_views > 0 || stats.active_editors > 0);

  const fmt = (n: number) => formatCompactNumber(n, locale);

  const sectionIndex = [
    { num: '01', label: t.landing.heroIndexBoard, href: '#board' },
    { num: '02', label: t.landing.heroIndexRoles, href: '#roles' },
    { num: '03', label: t.landing.heroIndexHow, href: '#how' },
    { num: '04', label: t.landing.heroIndexFaq, href: '#faq' },
  ];

  // Бегущая строка: реальные цифры площадки + короткие факты о том, как
  // устроена сделка. Дублирование элементов делает сам компонент Ticker.
  const tickerItems = [
    t.common.earlyAccess,
    ...(hasStats && stats
      ? [
          `${t.landing.tapePlatform}: ${fmt(stats.completed_edits)} ${t.landing.tapeEditsWord}`,
          `${fmt(stats.total_views)} ${t.landing.tapeViewsWord}`,
          `${fmt(stats.active_editors)} ${t.landing.tapeActiveWord}`,
        ]
      : []),
    ...leaderboard.slice(0, 5).map((e) => `${e.display_name} — ${fmt(e.total_views)}`),
    t.landing.tapeModerated,
    t.landing.tapePaid,
  ];

  const stepList = [
    { n: '01', title: t.landing.step1Title, text: t.landing.step1Text },
    { n: '02', title: t.landing.step2Title, text: t.landing.step2Text },
    { n: '03', title: t.landing.step3Title, text: t.landing.step3Text },
  ];
  const editorStepList = [
    { n: '01', title: t.landing.editorStep1Title, text: t.landing.editorStep1Text },
    { n: '02', title: t.landing.editorStep2Title, text: t.landing.editorStep2Text },
    { n: '03', title: t.landing.editorStep3Title, text: t.landing.editorStep3Text },
  ];

  const dealRows = [
    { Icon: Users, text: t.landing.deal1 },
    { Icon: ShieldCheck, text: t.landing.deal2 },
    { Icon: BadgeCheck, text: t.landing.deal3 },
    { Icon: Wallet, text: t.landing.deal4 },
  ];

  const faqItems = [
    { q: t.landing.faq1Q, a: t.landing.faq1A },
    { q: t.landing.faq2Q, a: t.landing.faq2A },
    { q: t.landing.faq3Q, a: t.landing.faq3A },
    { q: t.landing.faq4Q, a: t.landing.faq4A },
    { q: t.landing.faq5Q, a: t.landing.faq5A },
  ];

  return (
    <>
      <Nav />
      <main className="clip-x">
        {/* ── Hero: сплит 7/5, слева — суть обмена, справа — ночной визуал ── */}
        <section className="border-b border-border">
          <Container className="pb-section pt-section-lg">
            <Grid className="items-center">
              <div className="md:col-span-7">
                <p className="text-meta text-text-faint">{t.landing.kicker}</p>
                <HeroReveal text={t.landing.heroTitle} className="mt-5 text-display-sm text-text" />
                <p className="mt-7 max-w-container-text text-body-lg text-text-dim">
                  {t.landing.heroSubtitle}
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <LinkButton
                    href="/signup/artist"
                    variant="artist"
                    className="pop-in w-full sm:w-auto"
                    style={{ ['--pop-delay' as string]: '120ms' }}
                  >
                    <AudioLines size={16} strokeWidth={2} aria-hidden="true" />
                    {t.landing.heroPrimaryCta}
                  </LinkButton>
                  <LinkButton
                    href="/signup/editor"
                    variant="secondary"
                    className="pop-in w-full sm:w-auto"
                    style={{ ['--pop-delay' as string]: '220ms' }}
                  >
                    <Scissors size={16} strokeWidth={2} aria-hidden="true" />
                    {t.landing.heroSecondaryCta}
                  </LinkButton>
                </div>
              </div>

              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[4px] border border-border md:col-span-5 md:aspect-[5/4]">
                <div className="absolute inset-0">
                  <HeroVisual label={t.landing.heroVisualAlt} />
                </div>
              </div>
            </Grid>
          </Container>
        </section>

        {/* ── Полоска-оглавление: горизонтальная, во всю ширину контейнера ── */}
        <nav aria-label={t.landing.rolesTitle} className="border-b border-border">
          <Container className="flex flex-wrap gap-x-5 gap-y-2 py-3.5 sm:gap-x-8 sm:py-4">
            {sectionIndex.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group inline-flex items-baseline gap-2 text-meta text-text-faint transition hover:text-text"
              >
                <span className="tabular text-accent">{item.num}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </Container>
        </nav>

        {/* ── «Лента»: реальные цифры, всегда заполнена, движется ── */}
        <Ticker items={tickerItems} />

        {/* ── «Пока идёт первый набор»: ранняя стадия как «зайди первым» ── */}
        <section id="board" className="scroll-mt-24 border-b border-border">
          <Container className="py-section">
            <Grid className="gap-y-10 sm:gap-y-12">
              <div className="md:col-span-5">
                <h2 className="text-headline text-text">{t.landing.boardHeading}</h2>
                <p className="mt-5 max-w-container-text text-body-lg text-text-dim">
                  {t.landing.cohortManifesto}
                </p>
                <LinkButton href="/signup/artist" variant="artist" className="mt-8 w-full sm:w-auto">
                  {t.landing.cohortCta}
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </LinkButton>
              </div>

              <div className="md:col-span-6 md:col-start-7">
                {hasStats && stats && (
                  <dl className="border-t border-border">
                    {[
                      { n: stats.completed_edits, label: t.landing.statsCompletedLabel, glow: true },
                      { n: stats.total_views, label: t.landing.statsViewsLabel, glow: false },
                      { n: stats.active_editors, label: t.landing.statsEditorsLabel, glow: false },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-4 border-b border-border py-3.5"
                      >
                        <dt className="text-meta text-text-faint">{row.label}</dt>
                        <dd
                          className="shrink-0 text-2xl tabular text-text"
                          style={
                            row.glow
                              ? { textShadow: '0 0 22px rgba(236, 72, 153, 0.45)' }
                              : undefined
                          }
                        >
                          {fmt(row.n)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <p className="mt-8 text-meta text-text-faint">{t.landing.cohortRosterLabel}</p>
                <ul className="mt-3">
                  {leaderboard.map((e, i) => (
                    <li
                      key={`${e.display_name}-${i}`}
                      className="flex items-baseline justify-between gap-4 border-t border-border py-4"
                    >
                      <div className="flex min-w-0 items-baseline gap-4">
                        <span className="tabular text-text-faint">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-title text-text">
                            {e.display_name}
                          </span>
                          {i === 0 && (
                            <span className="mt-0.5 inline-flex items-center gap-1.5 text-micro uppercase text-primary">
                              <BadgeCheck size={13} strokeWidth={2} aria-hidden="true" />
                              {t.landing.cohortFirstBadge}
                            </span>
                          )}
                        </div>
                      </div>
                      {leaderboard.length > 1 && (
                        <span className="shrink-0 text-right">
                          <span className="block text-title tabular text-text">
                            {fmt(e.total_views)}
                          </span>
                          <span className="text-micro uppercase text-text-faint">
                            {t.landing.cohortViewsWord}
                          </span>
                        </span>
                      )}
                    </li>
                  ))}

                  {/* Один явный открытый слот — приглашение артисту, пунктир. */}
                  <li className="border-t border-border py-4">
                    <Link
                      href="/signup/artist"
                      className="group flex items-baseline justify-between gap-4"
                    >
                      <span className="flex items-baseline gap-4">
                        <span className="tabular text-text-faint">
                          {String(leaderboard.length + 1).padStart(2, '0')}
                        </span>
                        <span className="border-b border-dashed border-primary/60 text-title text-text transition group-hover:border-primary">
                          {t.landing.cohortSlotYou}
                        </span>
                      </span>
                      <ArrowRight
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="shrink-0 translate-y-1 text-primary transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </li>
                </ul>
              </div>
            </Grid>
          </Container>
        </section>

        {/* ── Развилка «Я артист / Я эдитор»: симметричные панели, равный вес ── */}
        <section id="roles" className="scroll-mt-24 border-b border-border">
          <Container className="py-section-lg">
            <div className="grid gap-px overflow-hidden rounded-[4px] border border-border bg-border md:grid-cols-2">
              {/* Артист */}
              <div className="flex flex-col bg-bg p-6 md:p-8">
                <span aria-hidden="true" className="h-[2px] w-12 bg-primary" />
                <div className="mt-6 flex items-center gap-3 text-primary">
                  <AudioLines size={26} strokeWidth={1.75} aria-hidden="true" />
                  <p className="text-meta text-text-faint">{t.landing.artistTag}</p>
                </div>
                <h3 className="mt-3 text-display-sm text-text">{t.landing.artistTitle}</h3>
                <p className="mt-3 max-w-sm text-body text-text-dim">{t.landing.artistText}</p>

                <ol className="mt-7 flex flex-col gap-2.5 border-t border-border pt-5">
                  {stepList.map((s) => (
                    <li key={s.n} className="flex gap-3 text-title text-text">
                      <span className="tabular text-primary">{s.n}</span>
                      <span>{s.title}</span>
                    </li>
                  ))}
                </ol>

                <LinkButton href="/signup/artist" variant="artist" className="mt-8 w-full sm:w-auto sm:self-start">
                  {t.landing.registerBtn}
                </LinkButton>
              </div>

              {/* Эдитор */}
              <div className="flex flex-col bg-bg p-6 md:p-8">
                <span aria-hidden="true" className="h-[2px] w-12 bg-accent" />
                <div className="mt-6 flex items-center gap-3 text-accent">
                  <Scissors size={26} strokeWidth={1.75} aria-hidden="true" />
                  <p className="text-meta text-text-faint">{t.landing.editorTag}</p>
                </div>
                <h3 className="mt-3 text-display-sm text-text">{t.landing.editorTitle}</h3>
                <p className="mt-3 max-w-sm text-body text-text-dim">{t.landing.editorText}</p>

                <ol className="mt-7 flex flex-col gap-2.5 border-t border-border pt-5">
                  {editorStepList.map((s) => (
                    <li key={s.n} className="flex gap-3 text-title text-text">
                      <span className="tabular text-accent">{s.n}</span>
                      <span>{s.title}</span>
                    </li>
                  ))}
                </ol>

                <LinkButton href="/signup/editor" variant="primary" className="mt-8 w-full sm:w-auto sm:self-start">
                  {t.landing.registerBtn}
                </LinkButton>
              </div>
            </div>
          </Container>
        </section>

        {/* ── Как устроена сделка: строки доверия, зелёные галки ── */}
        <section id="how" className="scroll-mt-24 border-b border-border">
          <Container className="pb-section pt-section-sm">
            <Grid>
              <div className="md:col-span-4">
                <h2 className="text-headline text-text md:sticky md:top-24">{t.landing.dealTitle}</h2>
                <p className="mt-4 max-w-container-text text-body text-text-dim md:sticky md:top-40">
                  {t.landing.dealIntro}
                </p>
              </div>
              <ul className="md:col-span-7 md:col-start-6">
                {dealRows.map(({ Icon, text }, i) => (
                  <li
                    key={i}
                    className="flex gap-4 border-t border-border py-5 last:border-b"
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-success"
                    />
                    <p className="text-body-lg text-text-dim">{text}</p>
                  </li>
                ))}
              </ul>
            </Grid>
          </Container>
        </section>

        {/* ── Отзывы: выносная цитата, чередующийся отступ (рендерится при данных) ── */}
        {reviews.length > 0 && (
          <section className="border-b border-border">
            <Container className="py-section">
              <h2 className="text-meta text-text-faint">{t.landing.reviewsTitle}</h2>
              <div className="mt-12 flex flex-col gap-16">
                {reviews.map((r, i) => (
                  <figure
                    key={i}
                    className={`max-w-3xl ${i % 2 === 1 ? 'md:ml-auto md:text-right' : ''}`}
                  >
                    <div
                      className={`flex gap-0.5 text-accent ${i % 2 === 1 ? 'md:justify-end' : ''}`}
                      aria-hidden="true"
                    >
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          size={16}
                          strokeWidth={1.5}
                          className={s < r.rating ? 'fill-current' : 'opacity-30'}
                        />
                      ))}
                    </div>
                    {r.comment && (
                      <blockquote className="mt-4 text-headline text-text">«{r.comment}»</blockquote>
                    )}
                    <figcaption className="mt-4 text-meta text-text-faint">
                      {r.author_role === 'artist'
                        ? t.landing.reviewFromArtist
                        : t.landing.reviewFromEditor}
                      {r.campaign_title ? ` · ${r.campaign_title}` : ''}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* ── FAQ как блок доверия: крупные пронумерованные вопросы ── */}
        <section id="faq" className="scroll-mt-24 border-b border-border">
          <Container className="py-section-lg">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-meta text-success">
                  <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" />
                  {t.landing.faqEyebrow}
                </p>
                <h2 className="mt-3 text-headline text-text">{t.landing.faqTitle}</h2>
              </div>
              <p className="max-w-xs text-body text-text-faint sm:text-right">
                {t.landing.faqReassurance}
              </p>
            </div>
            <Faq items={faqItems} />
          </Container>
        </section>

        {/* ── Финальный призыв: одна дисплейная строка, без рамки ── */}
        <section className="border-b border-border">
          <Container className="pb-section pt-section-lg">
            <p className="text-display text-text">{t.landing.finalCtaLead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <LinkButton
                href="/signup/artist"
                variant="artist"
                className="w-full sm:w-auto"
              >
                {t.landing.finalCtaArtistLink}
              </LinkButton>
              <LinkButton
                href="/signup/editor"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                {t.landing.finalCtaEditorLink}
              </LinkButton>
            </div>
          </Container>
        </section>

        {/* ── Подвал ── */}
        <footer>
          <Container className="py-14">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-title text-text">J/R marketing</p>
                <p className="mt-1 text-meta text-text-faint">{t.common.earlyAccess}</p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <span className="text-meta text-text-faint">{t.landing.contactLabel}</span>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-body">
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
                        className="text-text-dim underline decoration-1 underline-offset-4 transition hover:text-text"
                      >
                        {label}
                      </a>
                    ) : (
                      <span key={label} className="text-text-faint">
                        {label}
                      </span>
                    )
                  )}
                </div>
                <Link
                  href="/terms"
                  className="text-micro uppercase text-text-faint transition hover:text-text"
                >
                  {t.terms.pageTitle}
                </Link>
              </div>
            </div>
          </Container>
        </footer>
      </main>
    </>
  );
}
