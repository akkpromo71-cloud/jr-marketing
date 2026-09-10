'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/log-error';

// Вызывается напрямую из клиентского компонента (LanguageSwitcher), не через <form> —
// это позволяет переключить язык и остаться на той же странице.
export async function setLocaleAction(locale: Locale, returnTo: string) {
  const store = await cookies();
  store.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  // Cookie знает только этот браузер, а письма уходят с сервера в фоне —
  // поэтому язык залогиненного пользователя дублируем в profiles.locale
  // (supabase/patch-draft-flow.sql). Сбой записи не должен мешать
  // переключению языка: логируем и идём дальше.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('profiles').update({ locale }).eq('id', user.id);
      if (error) logError('setLocaleAction', error, { userId: user.id });
    }
  } catch (err) {
    logError('setLocaleAction', err);
  }

  redirect(returnTo || '/');
}
