'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';

// Эдитор сам меняет реквизиты выплаты (RLS: profiles_update_self_or_admin
// разрешает пользователю обновлять только свою строку — см. supabase/schema.sql
// и supabase/patch-payouts-and-campaign-details.sql).
export async function updatePayoutAction(formData: FormData) {
  const paypalEmail = String(formData.get('paypal_email') ?? '').trim() || null;
  const cryptoWallet = String(formData.get('crypto_wallet') ?? '').trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();

  if (!paypalEmail && !cryptoWallet) {
    redirect(`/settings?error=${encodeURIComponent(t.errors.needOnePayout)}`);
  }

  await supabase
    .from('profiles')
    .update({ paypal_email: paypalEmail, crypto_wallet: cryptoWallet })
    .eq('id', user.id);

  revalidatePath('/settings');
  revalidatePath('/feed');
  redirect('/settings?saved=1');
}
