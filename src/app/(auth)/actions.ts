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

  redirect(next || roleHome(profile?.role));
}

export async function signUpEditorAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('display_name') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();
  const priceMin = Number(formData.get('price_min') ?? 0) || null;
  const priceMax = Number(formData.get('price_max') ?? 0) || null;
  const telegram = String(formData.get('telegram') ?? '').trim() || null;
  const instagram = String(formData.get('instagram') ?? '').trim() || null;
  const tiktok = String(formData.get('tiktok') ?? '').trim() || null;

  const { t } = await getDict();

  // Серверная проверка обязательных полей — HTML required можно обойти,
  // отправив запрос напрямую, минуя форму. Портфолио не требуем;
  // из соцсетей обязателен хотя бы один Instagram/TikTok, Telegram — по желанию.
  if (!displayName || !bio || !priceMin || !priceMax) {
    redirect(`/signup/editor?error=${encodeURIComponent(t.errors.fillRequired)}`);
  }
  if (!instagram && !tiktok) {
    redirect(`/signup/editor?error=${encodeURIComponent(t.errors.needOneSocial)}`);
  }
  if (priceMin! > priceMax!) {
    redirect(`/signup/editor?error=${encodeURIComponent(t.errors.priceRange)}`);
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
        price_min: priceMin,
        price_max: priceMax,
        telegram,
        instagram,
        tiktok,
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
