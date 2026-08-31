'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchTikTokStats } from '@/lib/tiktok';
import type { ApplicationStatus } from '@/lib/types';

// Принимать/отклонять отклик и принимать/возвращать сданную работу теперь
// может только администратор — артист только даёт бюджет и бриф, подбор
// эдиторов ведёт команда J/R marketing (проверка роли — доп. защита поверх
// RLS-политики applications_update и триггера check_application_transition).
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

  await supabase.from('applications').update({ status }).eq('id', applicationId);

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/dashboard');
  revalidatePath('/applications');
  revalidatePath('/admin');
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

// Эдитор заливает эдит на СВОЙ аккаунт (не артиста) — он только оставляет ссылку.
// Просмотры и лайки дальше подтягиваются автоматически: сразу при сохранении
// (для мгновенной обратной связи) и потом раз в сутки кроном (см.
// src/app/api/cron/tiktok-stats/route.ts), который держит цифры свежими.
export async function updateEditResultAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  const postedUrl = String(formData.get('posted_url') ?? '').trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // .eq('editor_id', ...) — доп. защита на уровне запроса поверх RLS: сохранить
  // ссылку может только сам эдитор, приславший эту заявку.
  await supabase
    .from('applications')
    .update({ posted_url: postedUrl })
    .eq('id', applicationId)
    .eq('editor_id', user.id);

  // Пробуем сразу забрать цифры, чтобы не ждать сутки до первого запуска крона.
  // Если TikTok не отдал данные (заблокировал запрос, поменял вёрстку и т.д.) —
  // молча пропускаем, следующая попытка будет через плановую проверку раз в сутки.
  if (postedUrl) {
    // Короче, чем в кроне (там maxDuration=60) — эта попытка идёт синхронно
    // внутри отправки формы, не хотим держать эдитора дольше пары секунд.
    const stats = await fetchTikTokStats(postedUrl, 6000);
    if (stats) {
      await supabase
        .from('applications')
        .update({
          views_count: stats.views,
          likes_count: stats.likes,
          result_updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('editor_id', user.id);
    }
  }

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/dashboard');
  if (campaignId) revalidatePath(`/dashboard/campaigns/${campaignId}`);
}
