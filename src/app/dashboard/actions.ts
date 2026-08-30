'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict, translateAuthError } from '@/lib/i18n';

export async function createCampaignAction(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  const description = String(formData.get('description') ?? '');
  const trackUrl = String(formData.get('track_url') ?? '') || null;
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
