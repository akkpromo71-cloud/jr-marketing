'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ApplicationStatus } from '@/lib/types';

export async function postRevisionMessageAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('revision_messages').insert({
    application_id: applicationId,
    author_id: user!.id,
    body,
  });

  revalidatePath(`/applications/${applicationId}`);
}

export async function updateApplicationStatusAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const status = String(formData.get('status') ?? '') as ApplicationStatus;

  const supabase = await createClient();
  await supabase.from('applications').update({ status }).eq('id', applicationId);

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/dashboard');
  revalidatePath('/applications');
}

export async function submitWorkAction(formData: FormData) {
  const applicationId = String(formData.get('application_id') ?? '');
  const submissionUrl = String(formData.get('submission_url') ?? '');

  const supabase = await createClient();
  await supabase
    .from('applications')
    .update({ submission_url: submissionUrl, status: 'delivered' })
    .eq('id', applicationId);

  revalidatePath(`/applications/${applicationId}`);
}
