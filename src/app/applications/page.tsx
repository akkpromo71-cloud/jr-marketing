import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Toast } from '@/components/toast';
import { Button, Field, inputClass } from '@/components/ui';
import { ToolStat, ToolTable, ToolEmptyRow, ToolSection } from '@/components/tool-ui';
import { Container } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { requestWithdrawalAction } from '@/app/applications/actions';
import { getDict } from '@/lib/i18n';
import { formatDateTime, nextDailyCronAt } from '@/lib/format';
import type { Earning, RejectReasonCode, Slot, Submission, Withdrawal } from '@/lib/types';

// Кабинет клиппера — режим «инструмент» (design-system/jr-marketing/MASTER.md):
// плотные таблицы вместо карточек, Manrope в заголовках (без Unbounded),
// JetBrains Mono для всех чисел, одна главная цифра экрана — баланс. Без
// анимаций появления.
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
  const nextRecalc = nextDailyCronAt(7);

  return (
    <>
      <Nav />
      <Toast successParam="submitted" successMessage={t.clip.submittedMsg} />
      <Toast successParam="withdrawn" successMessage={t.clip.withdrawnMsg} />
      <Toast errorParam="error" />
      <main className="py-6 sm:py-8">
        <Container>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-text-faint">{t.clip.myWorkTitle}</h1>

          {/* ── Главная цифра экрана: баланс ── */}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <ToolStat value={`${balance} $`} label={t.clip.balanceLabel} />
            <p className="text-xs text-text-faint">
              {t.clip.nextRecalcLabel}: <span className="font-mono tabular-nums text-text-dim">{formatDateTime(nextRecalc.toISOString(), locale)}</span>
            </p>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-text">{t.clip.withdrawBtn}</summary>
            <form action={requestWithdrawalAction} className="mt-3 flex flex-col gap-3 border border-border p-4">
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

          {/* ── Активные слоты ── */}
          <ToolSection title={t.clip.mySlotsTitle}>
            <ToolTable>
              <thead>
                <tr>
                  <th>{t.clip.mySlotsTitle}</th>
                  <th>{t.clip.slotExpiresLabel}</th>
                  <th className="num">{t.clip.amountLabel}</th>
                </tr>
              </thead>
              <tbody>
                {(slots ?? []).length === 0 && <ToolEmptyRow colSpan={3} text={t.clip.noActiveSlots} />}
                {(slots as SlotRow[] | null)?.map((s) => (
                  <tr key={s.id}>
                    <td className="text-text">{s.campaigns?.title ?? '—'}</td>
                    <td className="font-mono tabular-nums">{formatDateTime(s.expires_at, locale)}</td>
                    <td className="num font-mono tabular-nums text-text">{s.amount_reserved} $</td>
                  </tr>
                ))}
              </tbody>
            </ToolTable>
          </ToolSection>

          {/* ── Сданные ролики ── */}
          <ToolSection title={t.clip.mySubmissionsTitle}>
            <ToolTable>
              <thead>
                <tr>
                  <th>{t.clip.mySubmissionsTitle}</th>
                  <th>{t.clip.statusLabel}</th>
                  <th className="num">{t.clip.viewsLabel}</th>
                  <th className="num">{t.clip.earnedLabel}</th>
                </tr>
              </thead>
              <tbody>
                {(submissions ?? []).length === 0 && <ToolEmptyRow colSpan={4} text={t.clip.noSubmissions} />}
                {(submissions as SubmissionRow[] | null)?.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent hover:underline">
                        {s.campaigns?.title ?? s.url}
                      </a>
                      {s.capped && <p className="mt-0.5 text-micro text-warning">{t.clip.cappedLabel}</p>}
                      {s.flagged && <p className="mt-0.5 text-micro text-warning">{t.clip.flaggedLabel}</p>}
                      {s.status === 'rejected' && s.reject_reason_code && (
                        <p className="mt-0.5 text-micro text-danger">
                          {t.clip.rejectReasons[s.reject_reason_code as RejectReasonCode]}
                          {s.reject_reason_comment ? ` — ${s.reject_reason_comment}` : ''}
                        </p>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="num font-mono tabular-nums">{s.views_total}</td>
                    <td className="num font-mono tabular-nums text-text">{s.earned} $</td>
                  </tr>
                ))}
              </tbody>
            </ToolTable>
          </ToolSection>

          {/* ── История начислений ── */}
          <ToolSection title={t.clip.earningsHistoryTitle}>
            <ToolTable>
              <tbody>
                {(earnings ?? []).length === 0 && <ToolEmptyRow colSpan={2} text={t.clip.noEarnings} />}
                {(earnings as EarningRow[] | null)?.map((e) => (
                  <tr key={e.id}>
                    <td>{e.submissions?.campaigns?.title ?? '—'}</td>
                    <td className="num font-mono tabular-nums text-success">+{e.amount} $</td>
                  </tr>
                ))}
              </tbody>
            </ToolTable>
          </ToolSection>

          {/* ── История выводов ── */}
          <ToolSection title={t.clip.withdrawalsHistoryTitle} className="mb-6">
            <ToolTable>
              <tbody>
                {(withdrawals ?? []).length === 0 && <ToolEmptyRow colSpan={3} text={t.clip.noWithdrawals} />}
                {(withdrawals as Withdrawal[] | null)?.map((w) => (
                  <tr key={w.id}>
                    <td>{w.method}</td>
                    <td className="num font-mono tabular-nums text-text">{w.amount} $</td>
                    <td>
                      <StatusBadge status={w.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </ToolTable>
          </ToolSection>
        </Container>
      </main>
    </>
  );
}
