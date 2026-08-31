'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ApplicationStatus } from '@/lib/types';

export async function postRevisionMessageAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('revision_messages').insert({
    application_id: applicationId,
    author_id: user!.id,
    body,
  });

  revalidatePath(`/applications/${applicationId}`);
}

export async function updateApplicationStatusAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const status = String(formData.get('status') ?? '') as ApplicationStatus;

  const supabase = await createClient();
  await supabase.from('applications').update({ status }).eq('id', applicationId);

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/dashboard');
  revalidatePath('/applications');
}

export async function submitWorkAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const submissionUrl = String(formData.get('submission_url') ?? '');

  const supabase = await createClient();
  await supabase
    .from('applications')
    .update({ submission_url: submissionUrl, status: 'delivered' })
    .eq('id', applicationId);

  revalidatePath(`/applications/${applicationId}`);
}

// Эдитор заливает эдит на СВОЙ аккаунт (не артиста) — только у него есть доступ
// к статистике этого поста, поэтому цифры вносит именно он, вручную, и может
// обновлять их сколько угодно раз по мере роста просмотров.
export async function updateEditResultAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  const postedUrl = String(formData.get('posted_url') ?? '').trim() || null;
  const viewsRaw = String(formData.get('views_count') ?? '').trim();
  const likesRaw = String(formData.get('likes_count') ?? '').trim();
  const viewsCount = viewsRaw ? Number(viewsRaw) : null;
  const likesCount = likesRaw ? Number(likesRaw) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // .eq('editor_id', ...) — доп. защита на уровне запроса поверх RLS: обновить
  // результат может только сам эдитор, приславший эту заявку.
  await supabase
    .from('applications')
    .update({
      posted_url: postedUrl,
      views_count: viewsCount,
      likes_count: likesCount,
      result_updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('editor_id', user.id);

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/dashboard');
  if (campaignId) revalidatePath(`/dashboard/campaigns/${campaignId}`);
}
