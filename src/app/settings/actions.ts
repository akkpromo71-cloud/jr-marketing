'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';

// Эдитор сам меняет реквизиты выплаты (RLS: profiles_update_self_or_admin
// разрешает пользователю обновлять только свою строку — см. supabase/schema.sql
// и supabase/patch-payouts-and-campaign-details.sql).
export async function updatePayoutAction(formData: FormData) {
  const paypalEmail = String(formData.get('paypal_email') ?? '').trim() || null;
  const cryptoWallet = String(formData.get('crypto_wallet') ?? '').trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();

  if (!paypalEmail && !cryptoWallet) {
    redirect(`/settings?error=${encodeURIComponent(t.errors.needOnePayout)}`);
  }

  await supabase
    .from('profiles')
    .update({ paypal_email: paypalEmail, crypto_wallet: cryptoWallet })
    .eq('id', user.id);

  revalidatePath('/settings');
  revalidatePath('/feed');
  redirect('/settings?saved=1');
}

// Профиль (имя, фото, "о себе") — правит сам пользователь, для любой роли
// (артист и эдитор). Фото загружается в Supabase Storage, в публичный на
// чтение бакет "avatars" (см. supabase/patch-avatars-storage.sql) — RLS там
// разрешает писать только в свою же папку "{user_id}/...".
export async function updateProfileAction(formData: FormData) {
  const displayName = String(formData.get('display_name') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim() || null;
  const avatarFile = formData.get('avatar');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();

  if (!displayName) {
    redirect(`/settings?error=${encodeURIComponent(t.errors.fillRequired)}`);
  }

  const updates: { display_name: string; bio: string | null; avatar_url?: string } = {
    display_name: displayName,
    bio,
  };

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > 5 * 1024 * 1024) {
      redirect(`/settings?error=${encodeURIComponent(t.errors.avatarTooLarge)}`);
    }

    const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || undefined });

    if (uploadError) {
      redirect(`/settings?error=${encodeURIComponent(uploadError.message)}`);
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    // Метка времени в URL — без неё браузер может показать закешированную
    // старую аватарку после перезаливки (путь у файла остаётся тем же).
    updates.avatar_url = `${publicUrlData.publicUrl}?t=${Date.now()}`;
  }

  await supabase.from('profiles').update(updates).eq('id', user.id);

  revalidatePath('/settings');
  revalidatePath('/feed');
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  redirect('/settings?saved=1');
}
