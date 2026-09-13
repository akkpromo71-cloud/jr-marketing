'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';
import { safeUrl } from '@/lib/validate';
import { checkRateLimit } from '@/lib/rate-limit';
import { logError } from '@/lib/log-error';
import { notifyAdmin, fill } from '@/lib/notify';

// Взятие слота — резервирует per_clip_cap из бюджета кампании (см.
// public.take_slot в supabase/migrations/0004_clipping_functions.sql).
// Вся денежная логика и блокировки живут в БД; здесь только вызов и
// человекочитаемая ошибка.
export async function takeSlotAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const allowed = await checkRateLimit(`take-slot:${user.id}`, 20, 60 * 60);
  const { t } = await getDict();
  if (!allowed) {
    redirect(`/feed/${campaignId}?error=${encodeURIComponent(t.errors.tooManyAttempts)}`);
  }

  const { error } = await supabase.rpc('take_slot', { p_campaign_id: campaignId });
  if (error) {
    logError('takeSlotAction', error, { campaignId, clipperId: user.id });
    redirect(`/feed/${campaignId}?error=${encodeURIComponent(t.errors.slotTakeFailed)}`);
  }

  const { data: campaign } = await supabase.from('campaigns').select('title').eq('id', campaignId).maybeSingle();
  const track = campaign?.title ?? '';
  await notifyAdmin(
    (e) => ({
      subject: fill(e.newApplicationSubject, { track }),
      body: fill(e.newApplicationBody, { track }),
    }),
    '/admin'
  );

  revalidatePath('/feed');
  revalidatePath(`/feed/${campaignId}`);
  revalidatePath('/applications');
  redirect(`/feed/${campaignId}?slot=1`);
}

export async function submitClipAction(formData: FormData) {
  const slotId = String(formData.get('slot_id') ?? '');
  const campaignId = String(formData.get('campaign_id') ?? '');
  const url = safeUrl(formData.get('url'));
  const platform = String(formData.get('platform') ?? '');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();
  if (!url) {
    redirect(`/feed/${campaignId}?error=${encodeURIComponent(t.errors.invalidUrl)}`);
  }

  const { error } = await supabase.rpc('submit_clip', {
    p_slot_id: slotId,
    p_url: url,
    p_platform: platform,
  });

  if (error) {
    logError('submitClipAction', error, { slotId, clipperId: user.id });
    const message = error.message?.includes('already submitted') ? t.errors.urlAlreadyUsed : t.errors.submitClipFailed;
    redirect(`/feed/${campaignId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/feed/${campaignId}`);
  revalidatePath('/applications');
  redirect('/applications?submitted=1');
}
