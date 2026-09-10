import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  AudioLines,
  Scissors,
  Users,
  ShieldCheck,
  BadgeCheck,
  Wallet,
  Star,
} from 'lucide-react';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { createClient } from '@/lib/supabase/server';
import { Nav } from '@/components/nav';
import { Container, Grid } from '@/components/layout';
import { LinkButton } from '@/components/ui';
import { HeroReveal } from '@/components/hero-reveal';
import { HeroVisual } from '@/components/hero-visual';
import { RoleVisual } from '@/components/role-visual';
import { Ticker } from '@/components/ticker';
import { Faq } from '@/components/faq';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber } from '@/lib/format';
import { TELEGRAM_URL } from '@/lib/contacts';

interface PublicStats {
  completed_edits: number;
  total_views: number;
  active_editors: number;
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
  // перестроен только презентационный слой. Лидерборд эдиторов больше не
  // выводится на лендинге (там был тестовый аккаунт), поэтому его результат
  // не разбираем, но запрос оставлен как есть.
  const [{ data: statsData }, , { data: reviewsData }] = await Promise.all([
    supabase.rpc('get_public_platform_stats'),
    supabase.rpc('get_editor_leaderboard', { p_limit: 10 }),
    supabase.rpc('get_public_reviews', { p_limit: 6 }),
  ]);

  const stats = (Array.isArray(statsData) ? statsData[0] : statsData) as PublicStats | undefined;
  const reviews = (reviewsData ?? []) as PublicReview[];
  const hasStats =
    !!stats && (stats.completed_edits > 0 || stats.total_views > 0 || stats.active_editors > 0);

  const fmt = (n: number) => formatCompactNumber(n, locale);
  // Склонение слова по числу: ru — [1, 2, 5], en — [1, много].
  const plural = (n: number, ru: [string, string, string], en: [string, string]) => {
    if (locale !== 'ru') return n === 1 ? en[0] : en[1];
    const a = n % 10;
    const b = n % 100;
    if (a === 1 && b !== 11) return ru[0];
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return ru[1];
    return ru[2];
  };

  const sectionIndex = [
    { num: '01', label: t.landing.heroIndexBoard, href: '#board' },
    { num: '02', label: t.landing.heroIndexRoles, href: '#roles' },
    { num: '03', label: t.landing.heroIndexHow, href: '#how' },
    { num: '04', label: t.landing.heroIndexFaq, href: '#faq' },
  ];

  // Бегущая строка: только реальные цифры площадки + короткие факты о сделке.
  // Дублирование элементов делает сам компонент Ticker.
  const tickerItems = [
    t.common.earlyAccess,
    ...(hasStats && stats
      ? [
          `${t.landing.tapePlatform}: ${fmt(stats.completed_edits)} ${plural(
            stats.completed_edits,
            ['эдит', 'эдита', 'эдитов'],
            ['edit', 'edits']
          )}`,
          `${fmt(stats.total_views)} ${t.landing.tapeViewsWord}`,
          `${fmt(stats.active_editors)} ${plural(
            stats.active_editors,
            ['эдитор в работе', 'эдитора в работе', 'эдиторов в работе'],
            ['editor working', 'editors working']
          )}`,
        ]
      : []),
    t.landing.tapeModerated,
    t.landing.tapePaid,
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
          <Container className="py-section">
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

              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[4px] border border-border sm:aspect-[16/11] md:col-span-5 md:aspect-[5/4]">
                <div className="absolute inset-0">
                  <HeroVisual label={t.landing.heroVisualAlt} />
                </div>
              </div>
            </Grid>
          </Container>
        </section>

        {/* ── Полоска-оглавление: якорные ссылки. На мобиле лишний шум — скрыта. ── */}
        <nav aria-label={t.landing.rolesTitle} className="hidden border-b border-border sm:block">
          <Container className="flex flex-wrap gap-x-8 gap-y-2 py-4">
            {sectionIndex.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group inline-flex items-baseline gap-2 text-meta text-text-faint transition hover:text-text"
              >
                <span className="tabular text-text-faint/70">{item.num}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </Container>
        </nav>

        {/* ── «Лента»: реальные цифры, всегда заполнена, движется ── */}
        <Ticker items={tickerItems} />

        {/* ── «Запустите продвижение первыми»: один эдит = крупное число ── */}
        <section id="board" className="scroll-mt-24 border-b border-border">
          <Container className="py-section-lg text-center">
            <h2 className="text-headline text-text">{t.landing.boardHeading}</h2>
            <p className="mx-auto mt-4 max-w-md text-body text-text-dim">
              {t.landing.cohortManifesto}
            </p>

            {hasStats && stats && (
              <>
                <p
                  className="mt-12 text-display font-extrabold leading-none text-text"
                  style={{ textShadow: '0 0 44px rgba(236, 72, 153, 0.26)' }}
                >
                  {fmt(stats.total_views)}
                </p>
                <p className="mx-auto mt-3 max-w-xs text-body-lg text-text-dim">
                  {t.landing.boardBigCaption}
                </p>
                <p className="mt-1 text-meta text-text-faint">
                  {stats.active_editors} {t.landing.boardEditorsCaption}
                </p>
              </>
            )}

            <div className="mx-auto mt-12 max-w-sm rounded border border-dashed border-primary/50 p-6">
              <p className="text-title text-text">{t.landing.cohortSlotYou}</p>
              <LinkButton href="/signup/artist" variant="artist" className="mt-4 w-full">
                {t.landing.cohortCta}
              </LinkButton>
            </div>
          </Container>
        </section>

        {/* ── Развилка ролей: карточка артиста доминирует (главный источник
            денег), карточка эдитора второстепенная. У каждой — стилизованный
            вертикальный визуал 9:16 приглушённым фоном. ── */}
        <section id="roles" className="scroll-mt-24 border-b border-border">
          <Container className="py-section">
            <div className="grid gap-4 md:grid-cols-12">
              {/* Артист — крупнее, светлее, заметнее */}
              <div className="relative flex flex-col overflow-hidden rounded border border-white/[0.16] bg-white/[0.07] p-6 md:col-span-7 md:p-9">
                <RoleVisual role="artist" />
                <div className="relative flex flex-1 flex-col">
                  {/* Кикер: текст белый (контраст), в цвет стороны — только
                      иконка (одинаково на обеих панелях). */}
                  <div className="flex items-center gap-2.5 text-primary">
                    <AudioLines size={20} strokeWidth={2} aria-hidden="true" />
                    <p className="text-[0.875rem] font-bold uppercase tracking-[0.14em] text-text">
                      {t.landing.artistTag}
                    </p>
                  </div>
                  <h3 className="mt-3 text-headline text-text md:min-h-[2.4em]">
                    {t.landing.artistTitle}
                  </h3>
                  <p className="mt-3 max-w-md text-body-lg text-text-dim">{t.landing.artistText}</p>
                  <p className="mt-6 rounded border border-white/10 bg-bg/50 p-4 text-sm text-text-faint">
                    {t.landing.forkArtistNeed}
                  </p>
                  <LinkButton
                    href="/signup/artist"
                    variant="artist"
                    className="mt-auto w-full md:w-auto md:self-start"
                  >
                    {t.landing.forkArtistCta}
                  </LinkButton>
                </div>
              </div>

              {/* Эдитор — второстепенная, тусклее */}
              <div className="relative flex flex-col overflow-hidden rounded border border-white/[0.1] bg-white/[0.035] p-6 md:col-span-5 md:p-8">
                <RoleVisual role="editor" />
                <div className="relative flex flex-1 flex-col">
                  <div className="flex items-center gap-2.5 text-accent">
                    <Scissors size={20} strokeWidth={2} aria-hidden="true" />
                    <p className="text-[0.875rem] font-bold uppercase tracking-[0.14em] text-text">
                      {t.landing.editorTag}
                    </p>
                  </div>
                  <h3 className="mt-3 text-headline text-text md:min-h-[2.4em]">
                    {t.landing.editorTitle}
                  </h3>
                  <p className="mt-3 text-body text-text-dim">{t.landing.editorText}</p>
                  <p className="mt-6 rounded border border-white/10 bg-bg/50 p-4 text-sm text-text-faint">
                    {t.landing.forkEditorNeed}
                  </p>
                  <LinkButton
                    href="/signup/editor"
                    variant="primary"
                    className="mt-auto w-full md:w-auto md:self-start"
                  >
                    {t.landing.forkEditorCta}
                  </LinkButton>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* ── Как устроена сделка: сетка 2×2 на всю ширину контейнера ── */}
        <section id="how" className="scroll-mt-24 border-b border-border">
          <Container className="py-section-sm">
            <h2 className="text-headline text-text">{t.landing.dealTitle}</h2>
            <p className="mt-3 max-w-xl text-body text-text-dim">{t.landing.dealIntro}</p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {dealRows.map(({ Icon, text }, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded border border-white/[0.12] bg-white/[0.03] p-5"
                >
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-text-faint"
                  />
                  <p className="text-body text-text-dim">{text}</p>
                </div>
              ))}
            </div>
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

        {/* ── FAQ: аккордеон на всю ширину контейнера, «+» одной колонкой справа ── */}
        <section id="faq" className="scroll-mt-24 border-b border-border">
          <Container className="py-section">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-meta text-text-faint">
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

        {/* ── Финальный призыв: плотный центрированный блок ── */}
        <section className="border-b border-border">
          <Container className="py-14 text-center sm:py-16">
            <h2 className="text-headline text-text">{t.landing.finalCtaLead}</h2>
            <p className="mx-auto mt-3 max-w-md text-body text-text-dim">
              {t.landing.finalCtaSubtitle}
            </p>
            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <LinkButton
                href="/signup/artist"
                variant="artist"
                className="w-full !px-7 !py-3.5 !text-base sm:w-auto"
              >
                {t.landing.finalCtaArtistLink}
              </LinkButton>
              <LinkButton
                href="/signup/editor"
                variant="secondary"
                className="w-full !px-7 !py-3.5 !text-base sm:w-auto"
              >
                {t.landing.finalCtaEditorLink}
              </LinkButton>
            </div>
          </Container>
        </section>

        {/* ── Подвал ── */}
        <footer>
          <Container className="py-11 sm:py-14">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <Image
                  src="/logo.png"
                  alt="J/R marketing"
                  width={512}
                  height={512}
                  className="h-14 w-auto scale-[1.12] mix-blend-screen"
                />
                <p className="mt-2 text-meta text-text-faint">{t.common.earlyAccess}</p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <span className="text-meta text-text-faint">{t.landing.contactLabel}</span>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-body">
                  {[
                    { label: t.landing.instagram, href: null },
                    { label: t.landing.telegramChannel, href: TELEGRAM_URL },
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
