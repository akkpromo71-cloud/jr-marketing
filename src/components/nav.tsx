import Link from 'next/link';
import Image from 'next/image';
import { getCurrentProfile } from '@/lib/current-profile';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NavMenu } from '@/components/nav-menu';
import { Avatar } from '@/components/avatar';
import { signOutAction } from '@/app/(auth)/actions';
import { getDict } from '@/lib/i18n';

export async function Nav() {
  const profile = await getCurrentProfile();
  const { locale, t } = await getDict();
  const hasProfilePage = profile?.role === 'editor' || profile?.role === 'artist';

  // Ссылки раздела по роли — общий список для десктопной строки и мобильного меню.
  const links: { href: string; label: string }[] = [
    ...(profile?.role === 'editor'
      ? [
          { href: '/feed', label: t.nav.feed },
          { href: '/applications', label: t.nav.myApplications },
        ]
      : []),
    ...(profile?.role === 'artist' ? [{ href: '/dashboard', label: t.nav.myCampaigns }] : []),
    ...(hasProfilePage ? [{ href: '/settings', label: t.nav.settings }] : []),
    ...(profile?.role === 'admin' ? [{ href: '/admin', label: t.nav.admin }] : []),
  ];

  const linkCls = 'text-text-dim transition hover:text-text';

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-2.5">
        {/* Фирменный лого (public/logo-mark.webp, 640×502, фон прозрачный).
            Никаких mix-blend/подложек/кадрирования — они были нужны только
            старому снимку с чёрным фоном. Исходник почти в 9 раз выше
            отрисовки, так что на ретине не мылится. */}
        <Link
          href="/"
          aria-label="J/R marketing"
          className="block shrink-0 transition hover:opacity-80 active:scale-95"
        >
          <Image
            src="/logo-mark.webp"
            alt="J/R marketing"
            width={640}
            height={502}
            priority
            className="h-11 w-auto sm:h-14"
          />
        </Link>

        {/* ── Десктоп ── */}
        <nav className="hidden items-center gap-4 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {l.label}
            </Link>
          ))}
          <LanguageSwitcher locale={locale} />
          {profile ? (
            <>
              {hasProfilePage && (
                <Link
                  href="/settings"
                  aria-label={t.nav.settings}
                  className="transition hover:opacity-80"
                >
                  <Avatar url={profile.avatar_url} name={profile.display_name} size={28} />
                </Link>
              )}
              <form action={signOutAction}>
                <button className="text-text-faint transition hover:text-text">{t.nav.logout}</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={linkCls}>
                {t.nav.login}
              </Link>
              {/* Нейтральная (outline) — синий на сайте закреплён за ролью эдитора. */}
              <Link
                href="/signup/artist"
                className="btn-pop rounded border border-white/25 px-4 py-2 text-xs font-semibold text-text hover:bg-white/[0.06]"
              >
                {t.nav.startCta}
              </Link>
            </>
          )}
        </nav>

        {/* ── Мобайл: логотип + язык + меню-шторка ── */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher locale={locale} />
          {profile && hasProfilePage && (
            <Link
              href="/settings"
              aria-label={t.nav.settings}
              className="transition hover:opacity-80"
            >
              <Avatar url={profile.avatar_url} name={profile.display_name} size={28} />
            </Link>
          )}
          <NavMenu
            links={
              profile
                ? links
                : [
                    { href: '/login', label: t.nav.login },
                    { href: '/signup/artist', label: t.nav.startCta },
                  ]
            }
            menuLabel={t.nav.menu}
            footer={
              profile ? (
                <form action={signOutAction}>
                  <button type="submit">{t.nav.logout}</button>
                </form>
              ) : undefined
            }
          />
        </div>
      </div>
    </header>
  );
}
