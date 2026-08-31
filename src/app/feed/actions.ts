'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict, translateAuthError } from '@/lib/i18n';

// Цену эдитор больше не придумывает под каждый отклик — берём его
// согласованную с администратором ставку из профиля (price_min), чтобы
// выплата всегда была той цифрой, которую утвердил админ при одобрении.
export async function applyToCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const coverNote = String(formData.get('cover_note') ?? '') || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: editorProfile } = await supabase
    .from('profiles')
    .select('price_min')
    .eq('id', user.id)
    .single();

  const { error } = await supabase.from('applications').insert({
    campaign_id: campaignId,
    editor_id: user.id,
    price: editorProfile?.price_min ?? null,
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
