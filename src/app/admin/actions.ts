'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function approveEditorAction(formData: FormData) {
  const editorId = String(formData.get('editor_id') ?? '');
  const price = Number(formData.get('price') ?? 0) || null;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({
      editor_status: 'approved',
      price_min: price,
      price_max: price,
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
