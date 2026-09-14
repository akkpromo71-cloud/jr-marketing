'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';
import { positiveNumberOrNull, clampText } from '@/lib/validate';
import { checkRateLimit } from '@/lib/rate-limit';
import { logError } from '@/lib/log-error';

// Заявка на вывод — без минимальной суммы (различие №2 площадки). Списание с
// баланса и сама проверка "хватает ли денег" — в public.request_withdrawal
// (supabase/migrations/0004_clipping_functions.sql), не здесь.
export async function requestWithdrawalAction(formData: FormData) {
  const amount = positiveNumberOrNull(formData.get('amount'));
  const method = String(formData.get('method') ?? '');
  const details = clampText(formData.get('details'), 300);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await getDict();
  if (!amount || !details) {
    redirect(`/applications?error=${encodeURIComponent(t.errors.withdrawalFailed)}`);
  }

  // Без минимальной суммы вывода заявку можно подать сколько угодно раз
  // подряд (каждая проходит проверку баланса в самой RPC, но это не повод
  // не ограничивать частоту попыток вообще).
  const allowed = await checkRateLimit(`withdraw:${user.id}`, 10, 60 * 60);
  if (!allowed) {
    redirect(`/applications?error=${encodeURIComponent(t.errors.tooManyAttempts)}`);
  }

  const { error } = await supabase.rpc('request_withdrawal', {
    p_amount: amount,
    p_method: method,
    p_details: details,
  });

  if (error) {
    logError('requestWithdrawalAction', error, { clipperId: user.id });
    const message = error.message?.includes('insufficient') ? t.errors.insufficientBalance : t.errors.withdrawalFailed;
    redirect(`/applications?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/applications');
  redirect('/applications?withdrawn=1');
}
