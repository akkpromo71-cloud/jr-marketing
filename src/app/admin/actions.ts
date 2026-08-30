'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function approveEditorAction(formData: FormData) {
  const editorId = String(formData.get('editor_id') ?? '');
  const priceMin = Number(formData.get('price_min') ?? 0) || null;
  const priceMax = Number(formData.get('price_max') ?? 0) || null;
  const activeCap = Number(formData.get('active_cap') ?? 3) || 3;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({
      editor_status: 'approved',
      price_min: priceMin,
      price_max: priceMax,
      active_cap: activeCap,
    })
    .eq('id', editorId);

  revalidatePath('/admin');
}

export async function rejectEditorAction(formData: FormData) {
  const editorId = String(formData.get('editor_id') ?? '');
  const supabase = await createClient();
  await supabase.from('profiles').update({ editor_status: 'rejected' }).eq('id', editorId);
  revalidatePath('/admin');
}
