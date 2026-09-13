import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Toast } from '@/components/toast';
import { Card, Button, Field, inputClass, EmptyState } from '@/components/ui';
import { Wallet as WalletIcon, Clapperboard, ListChecks } from 'lucide-react';
import { Container } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { requestWithdrawalAction } from '@/app/applications/actions';
import { getDict } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import type { Earning, RejectReasonCode, Slot, Submission, Withdrawal } from '@/lib/types';

export default async function MyWorkPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'editor' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const [{ data: slots }, { data: submissions }, { data: wallet }, { data: withdrawals }] = await Promise.all([
    profile
      ? supabase
          .from('slots')
          .select('*, campaigns(title)')
          .eq('clipper_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    profile
      ? supabase
          .from('submissions')
          .select('*, campaigns(title)')
          .eq('clipper_id', profile.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    profile ? supabase.from('wallets').select('balance').eq('clipper_id', profile.id).maybeSingle() : Promise.resolve({ data: null }),
    profile
      ? supabase.from('withdrawals').select('*').eq('clipper_id', profile.id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const submissionIds = (submissions ?? []).map((s) => s.id);
  const { data: earnings } = submissionIds.length
    ? await supabase
        .from('earnings')
        .select('*, submissions(campaigns(title))')
        .in('submission_id', submissionIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  type SlotRow = Slot & { campaigns: { title: string } | null };
  type SubmissionRow = Submission & { campaigns: { title: string } | null };
  type EarningRow = Earning & { submissions: { campaigns: { title: string } | null } | null };

  const balance = wallet?.balance ?? 0;

  return (
    <>
      <Nav />
      <Toast successParam="submitted" successMessage={t.clip.submittedMsg} />
      <Toast successParam="withdrawn" successMessage={t.clip.withdrawnMsg} />
      <Toast errorParam="error" />
      <main className="py-12">
        <Container>
          <h1 className="text-headline text-text">{t.clip.myWorkTitle}</h1>
          <p className="mt-1 text-body text-text-dim">{t.clip.myWorkSubtitle}</p>

          {/* ── Кошелёк ── */}
          <Card className="mt-8 flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-meta text-text-faint">{t.clip.balanceLabel}</p>
                <p className="text-display-sm tabular text-text">{balance} $</p>
              </div>
              <WalletIcon size={28} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
            </div>

            <details className="border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-text">{t.clip.withdrawBtn}</summary>
              <form action={requestWithdrawalAction} className="mt-3 flex flex-col gap-3">
                <p className="text-xs text-text-faint">{t.clip.withdrawHint}</p>
                <Field label={t.clip.amountLabel}>
                  <input className={inputClass} name="amount" type="number" step="0.01" min="0.01" max={balance} required />
                </Field>
                <Field label={t.clip.methodLabel}>
                  <select className={inputClass} name="method" required defaultValue="paypal">
                    <option value="paypal">{t.payout.paypal}</option>
                    <option value="crypto">{t.payout.crypto}</option>
                  </select>
                </Field>
                <Field label={t.clip.detailsLabel}>
                  <input className={inputClass} name="details" required placeholder={t.payout.cryptoPlaceholder} />
                </Field>
                <Button type="submit" variant="primary" className="self-start">
                  {t.clip.withdrawBtn}
                </Button>
              </form>
            </details>
          </Card>

          {/* ── Активные слоты ── */}
          <section className="mt-10">
            <h2 className="text-title text-text">{t.clip.mySlotsTitle}</h2>
            <div className="mt-4 flex flex-col gap-3">
              {(slots ?? []).length === 0 && <EmptyState icon={Clapperboard} text={t.clip.noActiveSlots} />}
              {(slots as SlotRow[] | null)?.map((s) => (
                <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm text-text">{s.campaigns?.title ?? '—'}</p>
                    <p className="text-xs text-text-faint">
                      {t.clip.slotExpiresLabel}: {formatDateTime(s.expires_at, locale)}
                    </p>
                  </div>
                  <span className="text-sm tabular text-text">{s.amount_reserved} $</span>
                </Card>
              ))}
            </div>
          </section>

          {/* ── Сданные ролики ── */}
          <section className="mt-10">
            <h2 className="text-title text-text">{t.clip.mySubmissionsTitle}</h2>
            <div className="mt-4 flex flex-col gap-3">
              {(submissions ?? []).length === 0 && <EmptyState icon={ListChecks} text={t.clip.noSubmissions} />}
              {(submissions as SubmissionRow[] | null)?.map((s) => (
                <Card key={s.id} className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-accent hover:underline">
                      {s.campaigns?.title ?? s.url}
                    </a>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-faint">
                    <span>
                      {t.clip.viewsLabel}: {s.views_total}
                    </span>
                    <span>
                      {t.clip.earnedLabel}: {s.earned} $
                    </span>
                    {s.capped && <span className="text-warning">{t.clip.cappedLabel}</span>}
                    {s.flagged && <span className="text-warning">{t.clip.flaggedLabel}</span>}
                  </div>
                  {s.status === 'rejected' && s.reject_reason_code && (
                    <p className="text-xs text-danger">
                      {t.clip.rejectReasonLabel}: {t.clip.rejectReasons[s.reject_reason_code as RejectReasonCode]}
                      {s.reject_reason_comment ? ` — ${s.reject_reason_comment}` : ''}
                    </p>
                  )}
                </Card>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-faint">{t.clip.nextRecalcHint}</p>
          </section>

          {/* ── История начислений ── */}
          <section className="mt-10">
            <h2 className="text-title text-text">{t.clip.earningsHistoryTitle}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {(earnings ?? []).length === 0 && <p className="text-sm text-text-faint">{t.clip.noEarnings}</p>}
              {(earnings as EarningRow[] | null)?.map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                  <span className="text-text-dim">{e.submissions?.campaigns?.title ?? '—'}</span>
                  <span className="tabular text-text">{e.amount} $</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── История выводов ── */}
          <section className="mt-10">
            <h2 className="text-title text-text">{t.clip.withdrawalsHistoryTitle}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {(withdrawals ?? []).length === 0 && <p className="text-sm text-text-faint">{t.clip.noWithdrawals}</p>}
              {(withdrawals as Withdrawal[] | null)?.map((w) => (
                <div key={w.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                  <span className="text-text-dim">{w.amount} $ — {w.method}</span>
                  <StatusBadge status={w.status} />
                </div>
              ))}
            </div>
          </section>
        </Container>
      </main>
    </>
  );
}
