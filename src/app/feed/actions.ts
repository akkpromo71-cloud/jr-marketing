'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';
import { clampText } from '@/lib/validate';
import { checkRateLimit } from '@/lib/rate-limit';
import { logError } from '@/lib/log-error';
import { notifyAdmin, fill } from '@/lib/notify';

// Цену эдитор больше не придумывает под каждый отклик — берём его
// согласованную с администратором ставку из профиля (price_min), чтобы
// выплата всегда была той цифрой, которую утвердил админ при одобрении.
export async function applyToCampaignAction(formData: FormData) {
  const campaignId = String(formData.get('campaign_id') ?? '');
  const coverNote = clampText(formData.get('cover_note'), 2000);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 20 откликов в час на пользователя — тут уже не про перебор пароля,
  // а про защиту от скриптованного флуда откликами (в один клик
  // не наберётся, а вот автоматический скрипт с валидным логином — легко).
  // Ключим по user.id, а не по IP: пользователь уже аутентифицирован.
  const allowed = await checkRateLimit(`apply:${user.id}`, 20, 60 * 60);
  if (!allowed) {
    const { t } = await getDict();
    redirect(`/feed/${campaignId}?error=${encodeURIComponent(t.errors.tooManyAttempts)}`);
  }

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
    // Сырую ошибку БД (дубль отклика, закрытая кампания, отказ RLS) человеку
    // не показываем — она уходит в лог, пользователь видит понятный текст.
    const { t } = await getDict();
    logError('applyToCampaignAction', error, { campaignId, editorId: user.id });
    redirect(`/feed/${campaignId}?error=${encodeURIComponent(t.errors.applyFailed)}`);
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('title')
    .eq('id', campaignId)
    .maybeSingle();
  const track = campaign?.title ?? '';
  await notifyAdmin(
    (e) => ({
      subject: fill(e.newApplicationSubject, { track }),
      body: fill(e.newApplicationBody, { track }),
    }),
    '/admin'
  );

  revalidatePath('/feed');
  revalidatePath('/applications');
  redirect('/applications?applied=1');
}
