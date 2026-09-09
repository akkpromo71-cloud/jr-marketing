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
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center transition hover:opacity-80 active:scale-95"
        >
          <Image
            src="/logo-mark.png"
            alt="J/R marketing"
            width={563}
            height={400}
            className="h-10 w-auto [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.18))] sm:h-12"
            priority
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
              <Link
                href="/signup/artist"
                className="btn-pop rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent hover:brightness-110 hover:shadow-[0_10px_28px_-8px_rgba(59,130,246,0.55)]"
              >
                {t.nav.startCta}
              </Link>
            </>
          )}
        </nav>

        {/* ── Мобайл ── */}
        <div className="flex items-center gap-2 md:hidden">
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
              <NavMenu
                links={links}
                menuLabel={t.nav.menu}
                footer={
                  <form action={signOutAction}>
                    <button type="submit">{t.nav.logout}</button>
                  </form>
                }
              />
            </>
          ) : (
            <>
              <Link href="/login" className={`${linkCls} text-xs`}>
                {t.nav.login}
              </Link>
              <Link
                href="/signup/artist"
                className="btn-pop rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent hover:brightness-110"
              >
                {t.nav.startCta}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
