'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { roleHome } from '@/lib/role-home';
import { positiveNumberOrNull } from '@/lib/validate';
import { logError } from '@/lib/log-error';

// Обе функции ниже раньше не проверяли роль вызывающего вовсе — их
// "защищала" только RLS-политика profiles_update_self_or_admin (id =
// auth.uid() OR is_admin()), а эта политика ещё и разрешает пользователю
// обновить СВОЮ строку. То есть эдитор мог напрямую вызвать
// approveEditorAction со своим editor_id и одобрить сам себя. Явная
// проверка роли здесь — это независимая защита поверх RLS/триггеров в БД
// (supabase/patch-security-hardening.sql), а не замена им.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect(roleHome(profile?.role));

  return supabase;
}

export async function approveEditorAction(formData: FormData) {
  const editorId = String(formData.get('editor_id') ?? '');
  const price = positiveNumberOrNull(formData.get('price'));

  const supabase = await requireAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({
      editor_status: 'approved',
      price_min: price,
      price_max: price,
    })
    .eq('id', editorId);

  // Например, если price окажется отрицательным — теперь это отклонит
  // CHECK-ограничение в БД (см. supabase/patch-numeric-check-constraints.sql),
  // и раньше эта ошибка терялась бы молча.
  if (error) logError('approveEditorAction', error, { editorId });

  revalidatePath('/admin');
}

export async function rejectEditorAction(formData: FormData) {
  const editorId = String(formData.get('editor_id') ?? '');
  const supabase = await requireAdmin();
  const { error } = await supabase.from('profiles').update({ editor_status: 'rejected' }).eq('id', editorId);
  if (error) logError('rejectEditorAction', error, { editorId });
  revalidatePath('/admin');
}
