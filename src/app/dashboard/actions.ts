'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';
import { roleHome } from '@/lib/role-home';
import { safeUrl, clampRating, positiveNumberOrNull, futureDateOrNull } from '@/lib/validate';
import { logError } from '@/lib/log-error';
import { campaignIsEditable } from '@/lib/campaign-editable';
import { notifyAdmin, fill } from '@/lib/notify';

export async function createCampaignAction(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '');
  const trackUrl = safeUrl(formData.get('track_url'));
  const spotifyUrl = safeUrl(formData.get('spotify_url'));
  const budget = positiveNumberOrNull(formData.get('budget'));
  // max_editors в БД = «сколько эдитов нужно» в интерфейсе: один эдит = один
  // слот эдитора, поэтому число и логика приёма заявок не меняются — только
  // формулировка для пользователя (колонку не переименовываем, чтобы не плодить
  // ещё одну миграцию).
  const maxEditors = Number(formData.get('max_editors') ?? 1) || 1;
  const termsAccepted = formData.get('terms_accepted') === '1';

  // Новый бриф для эдитора (supabase/patch-campaign-brief-fields.sql).
  const deadline = futureDateOrNull(formData.get('deadline'));
  // Название трека для описания: обязательно, по умолчанию = название кампании.
  const captionTitle =
    String(formData.get('track_title_for_caption') ?? '').trim().slice(0, 200) || title;
  const artistHandle = String(formData.get('artist_handle') ?? '').trim().slice(0, 120) || null;
  const trackSegment = String(formData.get('track_segment') ?? '').trim().slice(0, 200) || null;
  const restrictions = String(formData.get('restrictions') ?? '').trim().slice(0, 300) || null;
  const referenceUrls =
    formData
      .getAll('reference_urls')
      .map((v) => safeUrl(v))
      .filter((v): v is string => !!v)
      .slice(0, 3);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();

  // Чекбокс согласия с условиями кампании — HTML required можно обойти,
  // отправив запрос напрямую, поэтому проверяем ещё раз на сервере (тот же
  // приём, что и в signUpEditorAction/signUpArtistAction).
  if (!termsAccepted) {
    redirect(`/dashboard/new?error=${encodeURIComponent(t.errors.termsRequired)}`);
  }
  if (!budget) {
    redirect(`/dashboard/new?error=${encodeURIComponent(t.errors.budgetRequired)}`);
  }
  if (!formData.get('deadline')) {
    redirect(`/dashboard/new?error=${encodeURIComponent(t.errors.deadlineRequired)}`);
  }
  if (!deadline) {
    redirect(`/dashboard/new?error=${encodeURIComponent(t.errors.deadlineTooSoon)}`);
  }

  const { error } = await supabase.from('campaigns').insert({
    artist_id: user!.id,
    title,
    description,
    track_url: trackUrl,
    spotify_url: spotifyUrl,
    budget,
    max_editors: maxEditors,
    deadline,
    track_title_for_caption: captionTitle,
    artist_handle: artistHandle,
    track_segment: trackSegment,
    reference_urls: referenceUrls.length ? referenceUrls : null,
    restrictions,
    terms_accepted_at: new Date().toISOString(),
  });

  if (error) {
    // Сырую ошибку БД (например «Could not find the 'artist_handle' column …»)
    // пользователю не показываем — логируем для разработчика, а человеку даём
    // понятный текст на его языке.
    logError('createCampaignAction', error, { artistId: user!.id });
    redirect(`/dashboard/new?error=${encodeURIComponent(t.errors.campaignCreateFailed)}`);
  }

  await notifyAdmin(
    (e) => ({
      subject: fill(e.newCampaignSubject, { track: title }),
      body: fill(e.newCampaignBody, { track: title }),
    }),
    '/admin'
  );

  revalidatePath('/dashboard');
  revalidatePath('/feed');
  redirect('/dashboard?created=1');
}

// Правка уже опубликованной кампании — только владельцем и только пока
// campaignIsEditable (кампания открыта и по ней нет принятой заявки). Статусы
// и модерацию не трогаем: здесь меняются исключительно поля брифа.
// Поля и их валидация — те же, что в createCampaignAction выше.
export async function updateCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();

  const { data: existing } = await supabase
    .from('campaigns')
    .select('artist_id, status')
    .eq('id', campaignId)
    .single();
  // Чужую кампанию не показываем и не правим — так же, как страница кампании.
  if (!existing || existing.artist_id !== user.id) redirect('/dashboard');

  if (!(await campaignIsEditable(supabase, campaignId, existing.status))) {
    redirect(`/dashboard/campaigns/${campaignId}?error=${encodeURIComponent(t.errors.campaignEditLocked)}`);
  }

  const editHref = `/dashboard/campaigns/${campaignId}/edit`;
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '');
  const budget = positiveNumberOrNull(formData.get('budget'));
  const deadline = futureDateOrNull(formData.get('deadline'));

  if (!title || !description) {
    redirect(`${editHref}?error=${encodeURIComponent(t.errors.fillRequired)}`);
  }
  if (!budget) {
    redirect(`${editHref}?error=${encodeURIComponent(t.errors.budgetRequired)}`);
  }
  if (!formData.get('deadline')) {
    redirect(`${editHref}?error=${encodeURIComponent(t.errors.deadlineRequired)}`);
  }
  if (!deadline) {
    redirect(`${editHref}?error=${encodeURIComponent(t.errors.deadlineTooSoon)}`);
  }

  const referenceUrls = formData
    .getAll('reference_urls')
    .map((v) => safeUrl(v))
    .filter((v): v is string => !!v)
    .slice(0, 3);

  const { error } = await supabase
    .from('campaigns')
    .update({
      title,
      description,
      track_url: safeUrl(formData.get('track_url')),
      spotify_url: safeUrl(formData.get('spotify_url')),
      budget,
      deadline,
      track_title_for_caption:
        String(formData.get('track_title_for_caption') ?? '').trim().slice(0, 200) || title,
      artist_handle: String(formData.get('artist_handle') ?? '').trim().slice(0, 120) || null,
      track_segment: String(formData.get('track_segment') ?? '').trim().slice(0, 200) || null,
      reference_urls: referenceUrls.length ? referenceUrls : null,
      restrictions: String(formData.get('restrictions') ?? '').trim().slice(0, 300) || null,
    })
    .eq('id', campaignId)
    .eq('artist_id', user.id);

  if (error) {
    logError('updateCampaignAction', error, { campaignId });
    redirect(`${editHref}?error=${encodeURIComponent(t.errors.campaignUpdateFailed)}`);
  }

  revalidatePath('/dashboard');
  revalidatePath('/feed');
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  redirect(`/dashboard/campaigns/${campaignId}?saved=1`);
}

// Закрыть приём откликов может владелец кампании (артист) или админ — раньше
// это никак не проверялось в коде действия, только RLS-политикой
// campaigns_update_own_or_admin. Явная проверка здесь — независимая защита
// поверх неё же (если политику когда-нибудь случайно ослабят, действие всё
// равно останется безопасным).
async function requireCampaignOwnerOrAdmin(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'admin') return supabase;

  const { data: campaign } = await supabase.from('campaigns').select('artist_id').eq('id', campaignId).single();
  if (campaign?.artist_id !== user.id) redirect(roleHome(profile?.role));

  return supabase;
}

// Только админ может писать/менять роль — раньше проверки не было вовсе.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect(roleHome(profile?.role));

  return supabase;
}

export async function closeCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const supabase = await requireCampaignOwnerOrAdmin(campaignId);
  const { error } = await supabase.from('campaigns').update({ status: 'closed' }).eq('id', campaignId);
  if (error) logError('closeCampaignAction', error, { campaignId });
  revalidatePath('/dashboard');
  revalidatePath('/feed');
}

// Заметка от администратора для эдиторов ("сообщение от менеджера" в карточке
// трека) — раньше комментарий в коде честно признавал, что защиты нет
// ("на практике пишет только админ", то есть форма просто не показывается
// артисту в интерфейсе). Теперь проверяем роль по-настоящему.
export async function updateCampaignMessageAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const message = String(formData.get('manager_message') ?? '').trim() || null;
  const supabase = await requireAdmin();
  const { error } = await supabase.from('campaigns').update({ manager_message: message }).eq('id', campaignId);
  if (error) logError('updateCampaignMessageAction', error, { campaignId });
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath('/feed');
}

// Отзыв артиста — один на кампанию целиком (не на конкретного эдитора: артист
// не видит, кто именно работал над треком, это ведёт команда). RLS
// (reviews_insert_artist) пропустит запись только владельцу кампании и только
// когда по ней есть хотя бы одна заявка со статусом 'completed'.
export async function submitArtistReviewAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const rating = clampRating(formData.get('rating'));
  const comment = String(formData.get('comment') ?? '').trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('reviews').insert({
    campaign_id: campaignId,
    application_id: null,
    author_role: 'artist',
    rating,
    comment,
  });

  if (error) logError('submitArtistReviewAction', error, { campaignId });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}

// Публикация/снятие отзыва с лендинга — решает только администратор (та же
// модель модерации, что и для сообщения менеджера и одобрения эдиторов).
// Раньше проверки роли не было — только RLS (reviews_update_admin).
export async function toggleReviewPublishedAction(formData: FormData) {
  const reviewId = String(formData.get('review_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  const nextPublished = formData.get('next_published') === '1';

  const supabase = await requireAdmin();
  const { error } = await supabase.from('reviews').update({ is_published: nextPublished }).eq('id', reviewId);
  if (error) logError('toggleReviewPublishedAction', error, { reviewId });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath('/');
}
