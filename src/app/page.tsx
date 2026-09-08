import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { createClient } from '@/lib/supabase/server';
import { Nav } from '@/components/nav';
import { Container, Grid } from '@/components/layout';
import { HeroReveal } from '@/components/hero-reveal';
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

  // Публичные RPC (security definer, доступны анониму) — реальная сводная
  // статистика, лидерборд эдиторов по просмотрам и опубликованные админом
  // отзывы. Никаких выдуманных цифр: если данных ещё нет, секция просто не
  // рендерится, а не показывает пустоту или нули. ЗАПРОСЫ НЕ МЕНЯЛИСЬ —
  // перестроен только презентационный слой (REDESIGN_PLAN.md §4, §6).
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
  const hasBoard = hasStats || leaderboard.length > 0;

  const steps = [
    { num: '01', title: t.landing.step1Title, text: t.landing.step1Text, span: 'md:col-span-3' },
    // Шаг 2 — реальная ценность площадки (мы сами подбираем эдитора), поэтому
    // столбец намеренно шире остальных (REDESIGN_PLAN.md §4.5).
    { num: '02', title: t.landing.step2Title, text: t.landing.step2Text, span: 'md:col-span-6' },
    { num: '03', title: t.landing.step3Title, text: t.landing.step3Text, span: 'md:col-span-3' },
  ];

  const faqItems = [
    { q: t.landing.faq1Q, a: t.landing.faq1A },
    { q: t.landing.faq2Q, a: t.landing.faq2A },
    { q: t.landing.faq3Q, a: t.landing.faq3A },
    { q: t.landing.faq4Q, a: t.landing.faq4A },
    { q: t.landing.faq5Q, a: t.landing.faq5A },
  ];

  const heroIndex = [
    { num: '01', label: t.landing.heroIndexBoard, href: '#board' },
    { num: '02', label: t.landing.heroIndexHow, href: '#how' },
    { num: '03', label: t.landing.heroIndexRoles, href: '#roles' },
    { num: '04', label: t.landing.heroIndexFaq, href: '#faq' },
  ];

  // Строки чёрной полосы-«ведомости» под хиро — только реальные цифры, из тех
  // же данных, что уже загружены выше. Статично (без бесконечной анимации).
  const bandItems = [
    ...(hasStats && stats
      ? [
          `${t.landing.tapePlatform} · ${formatCompactNumber(stats.completed_edits, locale)} ${t.landing.tapeEditsWord}`,
        ]
      : []),
    ...leaderboard
      .slice(0, 6)
      .map((e) => `${e.display_name} — ${formatCompactNumber(e.total_views, locale)} ${t.landing.tapeViewsWord}`),
    ...(hasStats && stats
      ? [`${formatCompactNumber(stats.active_editors, locale)} ${t.landing.tapeActiveWord}`]
      : []),
  ];

  const arrowLink =
    'group inline-flex items-center gap-2 text-text underline decoration-1 underline-offset-[6px] transition hover:opacity-60';

  return (
    <>
      <Nav />
      <main>
        {/* ── Hero: асимметричный сплит 7/5, левый флаг, оглавление справа ── */}
        <section>
          <Container className="py-section">
            <Grid className="items-end">
              {/* Хиро — above the fold, без Reveal: заголовок виден сразу, без
                  вспышки пустого экрана при загрузке. */}
              <div className="md:col-span-8">
                <p className="text-meta text-text-faint">{t.landing.kicker}</p>
                <HeroReveal
                  text={t.landing.heroTitle}
                  className="mt-6 text-display-sm text-text"
                />
                <p className="mt-8 max-w-container-text text-body-lg text-text-dim">
                  {t.landing.heroSubtitle}
                </p>
                <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-title">
                  <Link href="/signup/editor" className={arrowLink}>
                    {t.landing.editorTag}
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                  <Link href="/signup/artist" className={arrowLink}>
                    {t.landing.artistTag}
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              </div>

              {/* Оглавление страницы вместо картинки — редакторский приём,
                  оно же якорные ссылки. */}
              <nav
                aria-label={t.landing.rolesTitle}
                className="flex flex-col justify-end gap-3 md:col-span-3 md:col-start-10 md:self-stretch md:border-l md:border-border md:pl-6"
              >
                {heroIndex.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="group flex items-baseline gap-3 text-meta text-text-faint transition hover:text-text"
                  >
                    <span className="tabular">{item.num}</span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </nav>
            </Grid>
          </Container>
        </section>

        {/* Единственный цветной акцент на всей странице — тонкая иридесцентная
            линейка на границе хиро и «Ленты» (REDESIGN_PLAN.md §2.4). */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-[image:var(--gradient-iridescent-fade)]"
        />

        {/* ── Чёрная полоса-«ведомость»: реальные цифры площадки, статично ── */}
        {bandItems.length > 0 && (
          <div className="border-y border-border bg-accent text-on-accent">
            <Container className="flex flex-wrap items-center gap-x-8 gap-y-1.5 py-3">
              {bandItems.map((item, i) => (
                <span key={i} className="flex items-center text-micro uppercase tabular">
                  {i > 0 && (
                    <span aria-hidden="true" className="mr-8 opacity-40">
                      &#9670;
                    </span>
                  )}
                  {item}
                </span>
              ))}
            </Container>
          </div>
        )}

        {/* ── Ведомость: слияние сводных цифр и лидерборда, центральный блок ── */}
        {hasBoard && (
          <section id="board" className="scroll-mt-24 border-b border-border">
            <Container className="py-section">
              <Grid>
                <div className="md:col-span-4 md:sticky md:top-24 md:self-start">
                  <h2 className="text-headline text-text">{t.landing.boardHeading}</h2>
                  <p className="mt-4 max-w-container-text text-body text-text-dim">
                    {t.landing.boardIntro}
                  </p>
                  {hasStats && stats && (
                    <dl className="mt-10">
                      {[
                        { n: stats.completed_edits, label: t.landing.statsCompletedLabel },
                        { n: stats.total_views, label: t.landing.statsViewsLabel },
                        { n: stats.active_editors, label: t.landing.statsEditorsLabel },
                      ].map((row) => (
                        <div key={row.label} className="border-t border-border py-5">
                          <dd className="text-display-sm tabular text-text">
                            {formatCompactNumber(row.n, locale)}
                          </dd>
                          <dt className="mt-1 text-meta text-text-faint">{row.label}</dt>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                <div className="md:col-span-8">
                  {leaderboard.length > 0 ? (
                    <ol>
                      {leaderboard.map((e, i) => (
                          <li
                            key={`${e.display_name}-${i}`}
                            className={`border-t py-6 ${i < 3 ? 'border-text' : 'border-border'} ${
                              i === leaderboard.length - 1 ? 'border-b border-border' : ''
                            }`}
                          >
                            <div className="flex items-baseline justify-between gap-4">
                              <div className="flex items-baseline gap-4 sm:gap-6">
                                <span className="text-4xl tabular text-text-faint sm:text-display-sm">
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <div>
                                  <span className="block text-title text-text sm:text-headline">
                                    {e.display_name}
                                  </span>
                                  <span className="mt-1 block text-micro uppercase text-text-faint">
                                    {t.landing.leaderboardCompletedLabel}: {e.completed_count}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="block text-3xl tabular text-text sm:text-display-sm">
                                  {formatCompactNumber(e.total_views, locale)}
                                </span>
                                <span className="mt-1 block text-micro uppercase text-text-faint">
                                  {t.landing.statsViewsLabel}
                                </span>
                              </div>
                            </div>
                          </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-body text-text-dim">{t.landing.leaderboardSubtitle}</p>
                  )}
                </div>
              </Grid>
            </Container>
          </section>
        )}

        {/* ── Как это работает: горизонтальная временная линия ── */}
        <section id="how" className="scroll-mt-24 border-b border-border bg-surface2/20">
          <Container className="py-section">
            <h2 className="text-headline text-text">{t.landing.howItWorksTitle}</h2>
            <p className="mt-3 max-w-container-text text-body text-text-dim">
              {t.landing.howItWorksSubtitle}
            </p>
            <ol className="mt-16 grid grid-cols-1 gap-x-gutter gap-y-10 border-t border-border pt-8 md:grid-cols-12">
              {steps.map((s) => (
                <li key={s.num} className={s.span}>
                  <span className="text-display-sm tabular text-text-faint">{s.num}</span>
                  <h3 className="mt-3 text-title text-text">{s.title}</h3>
                  <p className="mt-2 max-w-container-text text-body text-text-dim">{s.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* ── Вход по ролям: намеренно неравный «сцепленный» блок ── */}
        <section id="roles" className="scroll-mt-24 border-b border-border">
          <Container className="py-section">
            <Grid>
              {/* Артист — первичный вход, крупнее (приносит бюджет/спрос). */}
              <div className="md:col-span-7">
                <p className="text-meta text-text-faint">{t.landing.artistTag}</p>
                <h2 className="mt-4 text-headline text-text">{t.landing.artistTitle}</h2>
                <p className="mt-5 max-w-container-text text-body text-text-dim">{t.landing.artistText}</p>
                <Link href="/signup/artist" className={`mt-8 text-title ${arrowLink}`}>
                  {t.landing.registerBtn}
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>

              {/* Эдитор — вторичный вход: узкий, мельче, смещён вниз, на линейке —
                  блоки сцепляются по диагонали, а не стоят близнецами. */}
              <div className="border-t border-border pt-6 md:col-span-4 md:col-start-9 md:mt-32">
                <p className="text-meta text-text-faint">{t.landing.editorTag}</p>
                <h3 className="mt-3 text-title text-text">{t.landing.editorTitle}</h3>
                <p className="mt-3 text-body text-text-dim">{t.landing.editorText}</p>
                <Link href="/signup/editor" className={`mt-6 text-body ${arrowLink}`}>
                  {t.landing.registerBtn}
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </Grid>
          </Container>
        </section>

        {/* ── Отзывы: крупная выносная цитата, чередующийся отступ ── */}
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
                    <div className="text-accent" aria-hidden="true">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </div>
                    {r.comment && (
                      <blockquote className="mt-4 text-headline text-text">«{r.comment}»</blockquote>
                    )}
                    <figcaption className="mt-4 text-meta text-text-faint">
                      {r.author_role === 'artist' ? t.landing.reviewFromArtist : t.landing.reviewFromEditor}
                      {r.campaign_title ? ` · ${r.campaign_title}` : ''}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* ── FAQ: тихая двухколоночная асимметрия 4/8, липкий заголовок ── */}
        <section id="faq" className="scroll-mt-24 border-b border-border">
          <Container className="py-section">
            <Grid>
              <div className="md:col-span-4">
                <h2 className="text-headline text-text md:sticky md:top-24">{t.landing.faqTitle}</h2>
              </div>
              <div className="md:col-span-8">
                {faqItems.map((item) => (
                  <details key={item.q} className="group border-t border-border py-5 last:border-b">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-title text-text marker:content-none [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span className="shrink-0 text-2xl text-text-faint transition-transform duration-300 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 max-w-container-text text-body text-text-dim">{item.a}</p>
                  </details>
                ))}
              </div>
            </Grid>
          </Container>
        </section>

        {/* ── Финальный призыв: одна дисплейная строка-подпись, не повтор хиро ── */}
        <section className="border-b border-border bg-accent text-on-accent">
          <Container className="py-section">
            <p className="text-display">{t.landing.finalCtaLead}</p>
            <p className="mt-6 text-headline">
              <Link
                href="/signup/artist"
                className="underline decoration-1 underline-offset-8 transition hover:opacity-70"
              >
                {t.landing.finalCtaArtistLink}
              </Link>{' '}
              <Link
                href="/signup/editor"
                className="underline decoration-1 underline-offset-8 transition hover:opacity-70"
              >
                {t.landing.finalCtaEditorLink}
              </Link>
            </p>
          </Container>
        </section>

        {/* ── Подвал-колофон ── */}
        <footer>
          <Container className="py-16">
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
