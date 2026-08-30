'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

// Вызывается напрямую из клиентского компонента (LanguageSwitcher), не через <form> —
// это позволяет переключить язык и остаться на той же странице.
export async function setLocaleAction(locale: Locale, returnTo: string) {
  const store = await cookies();
  store.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  redirect(returnTo || '/');
}
