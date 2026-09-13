'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';
import { roleHome } from '@/lib/role-home';
import { safeUrl, positiveNumberOrNull, clampText, smallPositiveInt } from '@/lib/validate';
import { logError } from '@/lib/log-error';
import { notifyAdmin, fill } from '@/lib/notify';
import type { Platform } from '@/lib/types';

const ALL_PLATFORMS: Platform[] = ['tiktok', 'reels', 'shorts'];

function parsePlatforms(formData: FormData): Platform[] {
  return formData
    .getAll('platforms')
    .map((v) => String(v))
    .filter((v): v is Platform => (ALL_PLATFORMS as string[]).includes(v));
}

async function requireOwnerOrAdmin(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'admin') return { supabase, userId: user.id };

  const { data: campaign } = await supabase.from('campaigns').select('artist_id').eq('id', campaignId).single();
  if (campaign?.artist_id !== user.id) redirect(roleHome(profile?.role));

  return { supabase, userId: user.id };
}

export async function createCampaignAction(formData: FormData) {
  const title = clampText(formData.get('title'), 200) ?? '';
  const description = clampText(formData.get('description'), 5000) ?? '';
  const cpmRate = positiveNumberOrNull(formData.get('cpm_rate'));
  const clientCpm = positiveNumberOrNull(formData.get('client_cpm'));
  const perClipCap = positiveNumberOrNull(formData.get('per_clip_cap'));
  const maxClips = smallPositiveInt(formData.get('max_clips_per_clipper'), 5, 1000);
  const slotTtlHours = smallPositiveInt(formData.get('slot_ttl_hours'), 72, 24 * 30);
  const platforms = parsePlatforms(formData);
  const rules = clampText(formData.get('rules'), 3000);
  const requiredCaption = clampText(formData.get('required_caption'), 300);
  const trackSoundUrl = safeUrl(formData.get('track_sound_url'));
  const sourceUrls = formData
    .getAll('source_urls')
    .map((v) => safeUrl(v))
    .filter((v): v is string => !!v)
    .slice(0, 5);
  const startingDeposit = positiveNumberOrNull(formData.get('starting_deposit'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();

  if (!title || !description || !cpmRate || !clientCpm || !perClipCap || platforms.length === 0) {
    redirect(`/dashboard/new?error=${encodeURIComponent(t.errors.campaignFieldsRequired)}`);
  }

  const { data: created, error } = await supabase
    .from('campaigns')
    .insert({
      artist_id: user.id,
      title,
      description,
      status: 'draft',
      cpm_rate: cpmRate,
      client_cpm: clientCpm,
      per_clip_cap: perClipCap,
      max_clips_per_clipper: maxClips,
      slot_ttl_hours: slotTtlHours,
      platforms,
      rules,
      required_caption: requiredCaption,
      track_sound_url: trackSoundUrl,
      source_urls: sourceUrls,
    })
    .select('id')
    .single();

  if (error || !created) {
    logError('createCampaignAction', error, { clientId: user.id });
    redirect(`/dashboard/new?error=${encodeURIComponent(t.errors.campaignCreateFailed)}`);
  }

  if (startingDeposit) {
    const { error: depositError } = await supabase
      .from('client_deposits')
      .insert({ campaign_id: created.id, client_id: user.id, amount: startingDeposit });
    if (depositError) logError('createCampaignAction:deposit', depositError, { campaignId: created.id });
  }

  await notifyAdmin(
    (e) => ({
      subject: fill(e.newCampaignSubject, { track: title }),
      body: fill(e.newCampaignBody, { track: title }),
    }),
    '/admin'
  );

  revalidatePath('/dashboard');
  redirect(`/dashboard/campaigns/${created.id}?created=1`);
}

export async function updateCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const { supabase } = await requireOwnerOrAdmin(campaignId);
  const { t } = await getDict();

  const title = clampText(formData.get('title'), 200) ?? '';
  const description = clampText(formData.get('description'), 5000) ?? '';
  const cpmRate = positiveNumberOrNull(formData.get('cpm_rate'));
  const clientCpm = positiveNumberOrNull(formData.get('client_cpm'));
  const perClipCap = positiveNumberOrNull(formData.get('per_clip_cap'));
  const maxClips = smallPositiveInt(formData.get('max_clips_per_clipper'), 5, 1000);
  const slotTtlHours = smallPositiveInt(formData.get('slot_ttl_hours'), 72, 24 * 30);
  const platforms = parsePlatforms(formData);
  const rules = clampText(formData.get('rules'), 3000);
  const requiredCaption = clampText(formData.get('required_caption'), 300);
  const trackSoundUrl = safeUrl(formData.get('track_sound_url'));
  const sourceUrls = formData
    .getAll('source_urls')
    .map((v) => safeUrl(v))
    .filter((v): v is string => !!v)
    .slice(0, 5);

  const editHref = `/dashboard/campaigns/${campaignId}/edit`;
  if (!title || !description || !cpmRate || !clientCpm || !perClipCap || platforms.length === 0) {
    redirect(`${editHref}?error=${encodeURIComponent(t.errors.campaignFieldsRequired)}`);
  }

  const { error } = await supabase
    .from('campaigns')
    .update({
      title,
      description,
      cpm_rate: cpmRate,
      client_cpm: clientCpm,
      per_clip_cap: perClipCap,
      max_clips_per_clipper: maxClips,
      slot_ttl_hours: slotTtlHours,
      platforms,
      rules,
      required_caption: requiredCaption,
      track_sound_url: trackSoundUrl,
      source_urls: sourceUrls,
    })
    .eq('id', campaignId);

  if (error) {
    logError('updateCampaignAction', error, { campaignId });
    redirect(`${editHref}?error=${encodeURIComponent(t.errors.campaignUpdateFailed)}`);
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  redirect(`/dashboard/campaigns/${campaignId}?saved=1`);
}

// Пополнение — только заявка, деньги на счёт кампании зачисляет
// admin_confirm_deposit (см. supabase/migrations/0004_clipping_functions.sql).
export async function requestDepositAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const amount = positiveNumberOrNull(formData.get('amount'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();
  if (!amount) {
    redirect(`/dashboard/campaigns/${campaignId}?error=${encodeURIComponent(t.errors.depositFailed)}`);
  }

  const { error } = await supabase.from('client_deposits').insert({ campaign_id: campaignId, client_id: user.id, amount });
  if (error) {
    logError('requestDepositAction', error, { campaignId, clientId: user.id });
    redirect(`/dashboard/campaigns/${campaignId}?error=${encodeURIComponent(t.errors.depositFailed)}`);
  }

  await notifyAdmin(
    (e) => ({ subject: fill(e.newCampaignSubject, { track: `deposit $${amount}` }), body: fill(e.newCampaignBody, { track: `deposit $${amount}` }) }),
    '/admin'
  );

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  redirect(`/dashboard/campaigns/${campaignId}?deposited=1`);
}

export async function pauseCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const { supabase } = await requireOwnerOrAdmin(campaignId);
  const { error } = await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaignId);
  if (error) logError('pauseCampaignAction', error, { campaignId });
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath('/feed');
}

export async function resumeCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const { supabase } = await requireOwnerOrAdmin(campaignId);
  const { error } = await supabase.from('campaigns').update({ status: 'active' }).eq('id', campaignId);
  if (error) logError('resumeCampaignAction', error, { campaignId });
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath('/feed');
}

// finish_campaign (RPC) отменяет неиспользованные слоты и возвращает их резерв
// в бюджет — «возврат неизрасходованного» из Этапа 4.
export async function finishCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const { supabase } = await requireOwnerOrAdmin(campaignId);
  const { error } = await supabase.rpc('finish_campaign', { p_campaign_id: campaignId });
  if (error) logError('finishCampaignAction', error, { campaignId });
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath('/feed');
}
