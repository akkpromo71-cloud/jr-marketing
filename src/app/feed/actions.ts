'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict, translateAuthError } from '@/lib/i18n';

export async function applyToCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const price = Number(formData.get('price') ?? 0) || null;
  const coverNote = String(formData.get('cover_note') ?? '') || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('applications').insert({
    campaign_id: campaignId,
    editor_id: user!.id,
    price,
    cover_note: coverNote,
  });

  if (error) {
    const { t } = await getDict();
    redirect(`/feed?error=${encodeURIComponent(translateAuthError(error.message, t))}`);
  }

  revalidatePath('/feed');
  revalidatePath('/applications');
  redirect('/applications?applied=1');
}
