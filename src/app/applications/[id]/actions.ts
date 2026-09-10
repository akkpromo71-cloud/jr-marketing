'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchTikTokStats } from '@/lib/tiktok';
import { safeUrl, clampRating, clampText } from '@/lib/validate';
import { getDict } from '@/lib/i18n';
import { logError } from '@/lib/log-error';
import { notifyUser, notifyAdmin, fill } from '@/lib/notify';
import type { ApplicationStatus } from '@/lib/types';

// Порядок работы (supabase/patch-draft-flow.sql):
//   accepted/in_revision -> эдитор сдаёт ЧЕРНОВИК (draft_url) -> delivered
//   delivered -> админ принимает (completed) или просит правки (in_revision)
//   completed -> эдитор публикует ролик и вносит posted_url
// Статусы прежние, новый не заводили — поменялось только то, ЧТО эдитор
// прикладывает на каждом шаге.

// Название кампании для письма — по нему получатель понимает, о каком треке речь.
async function campaignContext(applicationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('applications')
    .select('editor_id, campaign_id, campaigns(title, artist_id)')
    .eq('id', applicationId)
    .single();
  const campaigns = data?.campaigns as unknown as { title: string; artist_id: string } | null;
  return {
    editorId: data?.editor_id as string | undefined,
    campaignId: data?.campaign_id as string | undefined,
    title: campaigns?.title ?? '',
    artistId: campaigns?.artist_id as string | undefined,
  };
}

// Принимать/отклонять отклик и принимать сданную работу может только
// администратор — артист только даёт бюджет и бриф, подбор эдиторов ведёт
// команда J/R marketing (проверка роли — доп. защита поверх RLS-политики
// applications_update и триггера check_application_transition).
export async function updateApplicationStatusAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const status = String(formData.get('status') ?? '') as ApplicationStatus;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const ctx = await campaignContext(applicationId);

  const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId);

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/dashboard');
  revalidatePath('/applications');
  revalidatePath('/admin');

  // Триггер check_application_transition в БД может отклонить переход — например,
  // если у эдитора уже максимум активных заказов (см.
  // supabase/patch-active-cap-enforcement.sql).
  if (error) {
    const { t } = await getDict();
    logError('updateApplicationStatusAction', error, { applicationId, status });
    const message = error.message.includes('active job')
      ? t.errors.activeCapReached
      : t.errors.genericAuthError;
    redirect(`/applications/${applicationId}?error=${encodeURIComponent(message)}`);
  }

  if (ctx.editorId) {
    const link = `/applications/${applicationId}`;
    if (status === 'accepted') {
      await notifyUser(
        ctx.editorId,
        (e) => ({
          subject: fill(e.applicationAcceptedSubject, { track: ctx.title }),
          body: fill(e.applicationAcceptedBody, { track: ctx.title }),
        }),
        link
      );
    } else if (status === 'rejected') {
      await notifyUser(
        ctx.editorId,
        (e) => ({
          subject: fill(e.applicationRejectedSubject, { track: ctx.title }),
          body: fill(e.applicationRejectedBody, { track: ctx.title }),
        }),
        '/feed'
      );
    } else if (status === 'completed') {
      await notifyUser(
        ctx.editorId,
        (e) => ({
          subject: fill(e.workAcceptedSubject, { track: ctx.title }),
          body: fill(e.workAcceptedBody, { track: ctx.title }),
        }),
        link
      );
    }
  }
}

// Эдитор сдаёт ЧЕРНОВИК на приёмку. Ролик при этом ещё нигде не опубликован —
// поэтому правки не стоят эдитору снесённого поста и набранных просмотров.
export async function submitDraftAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const draftUrl = safeUrl(formData.get('draft_url'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();
  if (!draftUrl) {
    redirect(`/applications/${applicationId}?error=${encodeURIComponent(t.errors.invalidUrl)}`);
  }

  const ctx = await campaignContext(applicationId);

  // .eq('editor_id', ...) — доп. защита на уровне запроса поверх RLS: сдать
  // черновик может только сам эдитор, приславший эту заявку.
  const { error } = await supabase
    .from('applications')
    .update({ draft_url: draftUrl, status: 'delivered' })
    .eq('id', applicationId)
    .eq('editor_id', user.id);

  if (error) {
    logError('submitDraftAction', error, { applicationId });
    redirect(`/applications/${applicationId}?error=${encodeURIComponent(t.errors.genericAuthError)}`);
  }

  const link = `/applications/${applicationId}`;
  await notifyAdmin(
    (e) => ({
      subject: fill(e.draftSubmittedSubject, { track: ctx.title }),
      body: fill(e.draftSubmittedBody, { track: ctx.title }),
    }),
    link
  );
  if (ctx.artistId && ctx.campaignId) {
    await notifyUser(
      ctx.artistId,
      (e) => ({
        subject: fill(e.draftSubmittedSubject, { track: ctx.title }),
        body: fill(e.draftSubmittedBody, { track: ctx.title }),
      }),
      `/dashboard/campaigns/${ctx.campaignId}`
    );
  }

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/applications');
  revalidatePath('/admin');
}

// Приёмка не прошла: админ возвращает черновик на правки с комментарием.
// Комментарий пишем в существующую таблицу revision_messages (schema.sql) —
// отдельного поля для этого заводить не нужно.
export async function requestRevisionAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const note = clampText(formData.get('revision_note'), 2000);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const { t } = await getDict();
  if (!note) {
    redirect(`/applications/${applicationId}?error=${encodeURIComponent(t.errors.revisionNoteRequired)}`);
  }

  const ctx = await campaignContext(applicationId);

  const { error: noteError } = await supabase.from('revision_messages').insert({
    application_id: applicationId,
    author_id: user.id,
    body: note,
  });
  if (noteError) {
    logError('requestRevisionAction:note', noteError, { applicationId });
    redirect(`/applications/${applicationId}?error=${encodeURIComponent(t.errors.genericAuthError)}`);
  }

  const { error } = await supabase
    .from('applications')
    .update({ status: 'in_revision' })
    .eq('id', applicationId);
  if (error) {
    logError('requestRevisionAction:status', error, { applicationId });
    redirect(`/applications/${applicationId}?error=${encodeURIComponent(t.errors.genericAuthError)}`);
  }

  if (ctx.editorId) {
    await notifyUser(
      ctx.editorId,
      (e) => ({
        subject: fill(e.revisionRequestedSubject, { track: ctx.title }),
        body: fill(e.revisionRequestedBody, { track: ctx.title }),
      }),
      `/applications/${applicationId}`
    );
  }

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/applications');
  revalidatePath('/admin');
}

// Публикация — ПОСЛЕ приёмки (status = 'completed'). Эдитор заливает эдит на
// СВОЙ аккаунт и оставляет ссылку. Просмотры и лайки дальше подтягиваются
// автоматически: сразу при сохранении и потом кроном (см.
// src/app/api/cron/tiktok-stats/route.ts).
export async function updateEditResultAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  const postedUrl = safeUrl(formData.get('posted_url'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();

  // .eq('editor_id', ...) — доп. защита на уровне запроса поверх RLS.
  // post_missing сбрасываем: ссылка изменилась, старая отметка о пропавшем
  // посте к новой уже не относится.
  const { error: postedUrlError } = await supabase
    .from('applications')
    .update({ posted_url: postedUrl, post_missing: false, post_checked_at: null })
    .eq('id', applicationId)
    .eq('editor_id', user.id);

  if (postedUrlError) {
    logError('updateEditResultAction:posted_url', postedUrlError, { applicationId });
    redirect(`/applications/${applicationId}?error=${encodeURIComponent(t.errors.genericAuthError)}`);
  }

  // Пробуем сразу забрать цифры, чтобы не ждать сутки до первого запуска крона.
  // Если TikTok не отдал данные — молча пропускаем (fetchTikTokStats уже
  // логирует реальные сбои), следующая попытка будет плановой проверкой.
  if (postedUrl) {
    const stats = await fetchTikTokStats(postedUrl, 6000);
    if (stats) {
      const { error: statsError } = await supabase
        .from('applications')
        .update({
          views_count: stats.views,
          likes_count: stats.likes,
          result_updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('editor_id', user.id);
      if (statsError) logError('updateEditResultAction:stats', statsError, { applicationId });
    }
  }

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/dashboard');
  if (campaignId) revalidatePath(`/dashboard/campaigns/${campaignId}`);
}

// Отзыв эдитора о сотрудничестве по конкретной заявке — доступен только после
// того, как заявка получила статус 'completed' (RLS reviews_insert_editor
// проверяет это же условие ещё раз на уровне базы).
export async function submitEditorReviewAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  const rating = clampRating(formData.get('rating'));
  const comment = clampText(formData.get('comment'), 2000);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('reviews').insert({
    campaign_id: campaignId,
    application_id: applicationId,
    author_role: 'editor',
    rating,
    comment,
  });

  if (error) {
    const { t } = await getDict();
    logError('submitEditorReviewAction', error, { applicationId });
    redirect(`/applications/${applicationId}?error=${encodeURIComponent(t.errors.genericAuthError)}`);
  }

  revalidatePath(`/applications/${applicationId}`);
}
