'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { roleHome } from '@/lib/role-home';
import { positiveNumberOrNull, nonNegativeIntOrNull, clampText } from '@/lib/validate';
import { logError } from '@/lib/log-error';
import { notifyUser, fill } from '@/lib/notify';

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

// Причина отказа обязательна — форма не отправится без неё (select required +
// проверка ниже), а RPC admin_moderate_submission всё равно откажет без неё
// на уровне БД, если это когда-нибудь попробуют обойти напрямую.
export async function moderateSubmissionAction(formData: FormData) {
  const submissionId = String(formData.get('submission_id') ?? '');
  const approve = formData.get('decision') === 'approve';
  const reasonCode = String(formData.get('reason_code') ?? '') || null;
  const reasonComment = clampText(formData.get('reason_comment'), 500);

  const supabase = await requireAdmin();
  if (!approve && !reasonCode) {
    redirect('/admin?error=reject_reason_required#moderation');
  }

  const { data: submission } = await supabase.from('submissions').select('clipper_id, campaign_id').eq('id', submissionId).maybeSingle();

  const { error } = await supabase.rpc('admin_moderate_submission', {
    p_submission_id: submissionId,
    p_approve: approve,
    p_reason_code: approve ? null : reasonCode,
    p_reason_comment: approve ? null : reasonComment,
  });
  if (error) logError('moderateSubmissionAction', error, { submissionId });

  if (!error && submission?.clipper_id) {
    await notifyUser(
      submission.clipper_id,
      (e) => ({
        subject: approve ? e.workAcceptedSubject : e.applicationRejectedSubject,
        body: approve ? e.workAcceptedBody : e.applicationRejectedBody,
      }),
      '/applications'
    );
  }

  revalidatePath('/admin');
  revalidatePath('/applications');
}

export async function resolveFlagAction(formData: FormData) {
  const submissionId = String(formData.get('submission_id') ?? '');
  const credit = formData.get('decision') === 'credit';

  const supabase = await requireAdmin();
  const { error } = await supabase.rpc('admin_resolve_flag', { p_submission_id: submissionId, p_credit: credit });
  if (error) logError('resolveFlagAction', error, { submissionId });

  revalidatePath('/admin');
  revalidatePath('/applications');
}

export async function confirmDepositAction(formData: FormData) {
  const depositId = String(formData.get('deposit_id') ?? '');
  const approve = formData.get('decision') === 'approve';
  const comment = clampText(formData.get('comment'), 500);

  const supabase = await requireAdmin();
  const { data: deposit } = await supabase.from('client_deposits').select('client_id, campaign_id').eq('id', depositId).maybeSingle();

  const { error } = await supabase.rpc('admin_confirm_deposit', { p_deposit_id: depositId, p_approve: approve, p_comment: comment });
  if (error) logError('confirmDepositAction', error, { depositId });

  if (!error && deposit?.client_id) {
    await notifyUser(
      deposit.client_id,
      (e) => ({
        subject: fill(e.newCampaignSubject, { track: 'deposit' }),
        body: approve ? e.workAcceptedBody : e.applicationRejectedBody,
      }),
      `/dashboard/campaigns/${deposit.campaign_id}`
    );
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
}

export async function decideWithdrawalAction(formData: FormData) {
  const withdrawalId = String(formData.get('withdrawal_id') ?? '');
  const approve = formData.get('decision') === 'approve';
  const comment = clampText(formData.get('comment'), 500);

  const supabase = await requireAdmin();
  const { error } = await supabase.rpc('admin_decide_withdrawal', {
    p_withdrawal_id: withdrawalId,
    p_approve: approve,
    p_comment: comment,
  });
  if (error) logError('decideWithdrawalAction', error, { withdrawalId });

  revalidatePath('/admin');
  revalidatePath('/applications');
}

// Ручной ввод просмотров — обязательный фолбэк, когда автосбор не сработал
// (Этап 2). Идёт через ту же record_view_snapshot, что и крон, source='manual'.
export async function manualViewSnapshotAction(formData: FormData) {
  const submissionId = String(formData.get('submission_id') ?? '');
  const views = nonNegativeIntOrNull(formData.get('views'));
  const likes = nonNegativeIntOrNull(formData.get('likes')) ?? 0;

  const supabase = await requireAdmin();
  if (views === null) {
    redirect('/admin?error=invalid_views#manual-views');
  }

  const { error } = await supabase.rpc('record_view_snapshot', {
    p_submission_id: submissionId,
    p_views: views,
    p_likes: likes,
    p_source: 'manual',
  });
  if (error) logError('manualViewSnapshotAction', error, { submissionId });

  revalidatePath('/admin');
  revalidatePath('/applications');
}
