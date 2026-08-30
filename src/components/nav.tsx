import Link from 'next/link';
import Image from 'next/image';
import { getCurrentProfile } from '@/lib/current-profile';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { signOutAction } from '@/app/(auth)/actions';
import { getDict } from '@/lib/i18n';

export async function Nav() {
  const profile = await getCurrentProfile();
  const { locale, t } = await getDict();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center">
          {/* Логотип уже содержит надпись "JR marketing" — отдельный текст рядом не нужен,
              фон вырезан (см. public/logo-mark.png), поэтому крупный размер смотрится чисто. */}
          <Image
            src="/logo-mark.png"
            alt="J/R marketing"
            width={563}
            height={400}
            className="h-16 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {profile?.role === 'editor' && (
            <>
              <Link href="/feed" className="text-text-dim hover:text-text transition">
                {t.nav.feed}
              </Link>
              <Link href="/applications" className="text-text-dim hover:text-text transition">
                {t.nav.myApplications}
              </Link>
            </>
          )}
          {profile?.role === 'artist' && (
            <Link href="/dashboard" className="text-text-dim hover:text-text transition">
              {t.nav.myCampaigns}
            </Link>
          )}
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-text-dim hover:text-text transition">
              {t.nav.admin}
            </Link>
          )}
          <LanguageSwitcher locale={locale} />
          <ThemeToggle label={locale === 'en' ? 'Toggle theme' : 'Переключить тему'} />
          {profile ? (
            <form action={signOutAction}>
              <button className="text-text-faint hover:text-text transition">{t.nav.logout}</button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-accent"
            >
              {t.nav.login}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
