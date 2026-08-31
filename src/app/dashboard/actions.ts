'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict, translateAuthError } from '@/lib/i18n';

export async function createCampaignAction(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  const description = String(formData.get('description') ?? '');
  const trackUrl = String(formData.get('track_url') ?? '') || null;
  const spotifyUrl = String(formData.get('spotify_url') ?? '') || null;
  const budget = Number(formData.get('budget') ?? 0) || null;
  const maxEditors = Number(formData.get('max_editors') ?? 1) || 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('campaigns').insert({
    artist_id: user!.id,
    title,
    description,
    track_url: trackUrl,
    spotify_url: spotifyUrl,
    budget,
    max_editors: maxEditors,
  });

  if (error) {
    const { t } = await getDict();
    redirect(`/dashboard/new?error=${encodeURIComponent(translateAuthError(error.message, t))}`);
  }

  revalidatePath('/dashboard');
  revalidatePath('/feed');
  redirect('/dashboard?created=1');
}

export async function closeCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const supabase = await createClient();
  await supabase.from('campaigns').update({ status: 'closed' }).eq('id', campaignId);
  revalidatePath('/dashboard');
  revalidatePath('/feed');
}

// Заметка от администратора для эдиторов ("сообщение от менеджера" в карточке
// трека) — RLS (campaigns_update_own_or_admin) пропустит запись только
// владельцу-артисту или админу, но эта форма показывается только в
// админ-вьюхе страницы кампании, так что на практике пишет только админ.
export async function updateCampaignMessageAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const message = String(formData.get('manager_message') ?? '').trim() || null;
  const supabase = await createClient();
  await supabase.from('campaigns').update({ manager_message: message }).eq('id', campaignId);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath('/feed');
}

// Отзыв артиста — один на кампанию целиком (не на конкретного эдитора: артист
// не видит, кто именно работал над треком, это ведёт команда). RLS
// (reviews_insert_artist) пропустит запись только владельцу кампании и только
// когда по ней есть хотя бы одна заявка со статусом 'completed'.
export async function submitArtistReviewAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const rating = Number(formData.get('rating') ?? 5);
  const comment = String(formData.get('comment') ?? '').trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('reviews').insert({
    campaign_id: campaignId,
    application_id: null,
    author_role: 'artist',
    rating,
    comment,
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}

// Публикация/снятие отзыва с лендинга — решает только администратор (та же
// модель модерации, что и для сообщения менеджера и одобрения эдиторов).
export async function toggleReviewPublishedAction(formData: FormData) {
  const reviewId = String(formData.get('review_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  const nextPublished = formData.get('next_published') === '1';

  const supabase = await createClient();
  await supabase.from('reviews').update({ is_published: nextPublished }).eq('id', reviewId);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath('/');
}
