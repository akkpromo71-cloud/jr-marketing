'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict, translateAuthError } from '@/lib/i18n';

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

// "next" приходит из query-строки страницы логина (?next=...) — если взять
// его как есть, получается open redirect: злоумышленник присылает жертве
// ссылку вида /login?next=https://evil.example, жертва входит под своим
// реальным аккаунтом на настоящем сайте и тут же улетает на чужой домен.
// Разрешаем только локальный путь (начинается с одного "/", не с "//" —
// "//evil.example" браузер тоже воспринимает как переход на другой хост).
function safeNextPath(next: string): string | null {
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return null;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const { t } = await getDict();
    const message = translateAuthError(error.message, t);
    redirect(`/login?error=${encodeURIComponent(message)}${next ? `&next=${encodeURIComponent(next)}` : ''}`);
  }

  // getCurrentProfile сам создаст профиль на лету, если его почему-то ещё нет
  // (см. src/lib/current-profile.ts) — так что после успешного логина
  // пользователь никогда не должен "зависать" без роли.
  const profile = await getCurrentProfile();

  redirect(safeNextPath(next) || roleHome(profile?.role));
}

// Ссылка в письме ведёт на /auth/callback (уже обрабатывает подтверждение
// email и magic-link'и) с ?next=/reset-password — callback обменяет код на
// сессию и отправит пользователя на страницу выбора нового пароля.
const SITE_URL = 'https://jr-marketing-psi.vercel.app';

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const { t } = await getDict();

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent(t.errors.fillRequired)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });

  // Supabase сам не подтверждает и не опровергает в ответе, зарегистрирован ли
  // email (защита от user enumeration) — значит и наш редирект не должен,
  // кроме явных ошибок ввода (например, rate limit на стороне Supabase Auth).
  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(translateAuthError(error.message, t))}`);
  }

  redirect('/forgot-password?sent=1');
}

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const { t } = await getDict();

  if (password.length < 6) {
    redirect(`/reset-password?error=${encodeURIComponent(t.errors.weakPassword)}`);
  }

  const supabase = await createClient();
  // Работает только если пользователь уже в сессии восстановления — её
  // устанавливает /auth/callback при переходе по ссылке из письма. Страница
  // /reset-password сама проверяет наличие сессии до показа формы.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(translateAuthError(error.message, t))}`);
  }

  redirect('/login?reset=1');
}

export async function signUpEditorAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('display_name') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();
  const price = Number(formData.get('price') ?? 0) || null;
  const telegram = String(formData.get('telegram') ?? '').trim() || null;
  const instagram = String(formData.get('instagram') ?? '').trim() || null;
  const tiktok = String(formData.get('tiktok') ?? '').trim() || null;
  const paypalEmail = String(formData.get('paypal_email') ?? '').trim() || null;
  const cryptoWallet = String(formData.get('crypto_wallet') ?? '').trim() || null;

  const { t } = await getDict();

  // Серверная проверка обязательных полей — HTML required можно обойти,
  // отправив запрос напрямую, минуя форму. Портфолио не требуем;
  // из соцсетей обязателен хотя бы один Instagram/TikTok, Telegram — по желанию.
  if (!displayName || !bio || !price) {
    redirect(`/signup/editor?error=${encodeURIComponent(t.errors.fillRequired)}`);
  }
  if (!instagram && !tiktok) {
    redirect(`/signup/editor?error=${encodeURIComponent(t.errors.needOneSocial)}`);
  }
  // Без реквизитов выплаты некуда будет отправлять оплату за эдиты —
  // обязателен хотя бы один способ (PayPal или крипта).
  if (!paypalEmail && !cryptoWallet) {
    redirect(`/signup/editor?error=${encodeURIComponent(t.errors.needOnePayout)}`);
  }

  const supabase = await createClient();
  // Профиль создаётся автоматически триггером public.handle_new_user() в БД
  // (см. supabase/schema.sql) на основе этих metadata — так регистрация работает
  // независимо от того, требуется ли подтверждение email.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'editor',
        display_name: displayName,
        bio,
        // Единая цена эдитора: пишем в оба столбца (price_min/price_max),
        // чтобы не трогать схему БД — площадка везде показывает одно число.
        price_min: price,
        price_max: price,
        telegram,
        instagram,
        tiktok,
        paypal_email: paypalEmail,
        crypto_wallet: cryptoWallet,
      },
    },
  });

  if (error) {
    redirect(`/signup/editor?error=${encodeURIComponent(translateAuthError(error.message, t))}`);
  }

  redirect('/feed?welcome=editor');
}

export async function signUpArtistAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('display_name') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();

  const { t } = await getDict();

  if (!displayName || !bio) {
    redirect(`/signup/artist?error=${encodeURIComponent(t.errors.fillRequired)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'artist',
        display_name: displayName,
        bio,
      },
    },
  });

  if (error) {
    redirect(`/signup/artist?error=${encodeURIComponent(translateAuthError(error.message, t))}`);
  }

  redirect('/dashboard?welcome=artist');
}
