import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Toast } from '@/components/toast';
import { Card, Button, Field, inputClass, BackLink, LinkButton } from '@/components/ui';
import { Container } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import {
  requestDepositAction,
  pauseCampaignAction,
  resumeCampaignAction,
  finishCampaignAction,
} from '@/app/dashboard/actions';
import { getDict } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import type { Campaign, ClientDeposit, SoundUsageSnapshot, Submission } from '@/lib/types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default async function CampaignReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'artist' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();
  const c = campaign as Campaign & { id: string };
  if (profile?.role !== 'admin' && c.artist_id !== profile?.id) redirect('/dashboard');

  const [{ data: submissions }, { data: deposits }, { data: soundUsage }] = await Promise.all([
    supabase.from('submissions').select('*').eq('campaign_id', id).order('views_total', { ascending: false }),
    supabase.from('client_deposits').select('*').eq('campaign_id', id).order('created_at', { ascending: false }),
    c.track_sound_url
      ? supabase.from('sound_usage_snapshots').select('*').eq('campaign_id', id).order('checked_at', { ascending: false }).limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  const allSubs = (submissions ?? []) as Submission[];
  const approved = allSubs.filter((s) => s.status === 'approved' || s.status === 'removed');
  const deliveredViews = approved.reduce((sum, s) => sum + s.views_total, 0);
  const medianViews = median(approved.map((s) => s.views_total));
  const actualCpm = deliveredViews > 0 ? (c.budget_spent / deliveredViews) * 1000 : 0;
  const available = Math.max(c.budget_total - c.budget_reserved - c.budget_spent, 0);
  const topClips = approved.slice(0, 10);

  return (
    <>
      <Nav />
      <Toast successParam="saved" successMessage={t.settings.savedMsg} />
      <Toast successParam="deposited" successMessage={t.clip.depositBtn} />
      <main className="py-12">
        <Container>
          <BackLink href="/dashboard" label={t.common.back} />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-headline text-text">{c.title}</h1>
              <p className="mt-1 text-body text-text-dim">{c.description}</p>
            </div>
            <StatusBadge status={c.status} />
          </div>

          {error && (
            <div className="mt-6 rounded-[4px] border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <LinkButton href={`/dashboard/campaigns/${id}/edit`} variant="secondary">
              {t.clip.editBtn}
            </LinkButton>
            {c.status === 'active' && (
              <form action={pauseCampaignAction}>
                <input type="hidden" name="campaign_id" value={id} />
                <Button type="submit" variant="secondary">
                  {t.clip.pauseBtn}
                </Button>
              </form>
            )}
            {c.status === 'paused' && (
              <form action={resumeCampaignAction}>
                <input type="hidden" name="campaign_id" value={id} />
                <Button type="submit" variant="secondary">
                  {t.clip.resumeBtn}
                </Button>
              </form>
            )}
            {c.status !== 'finished' && (
              <form action={finishCampaignAction}>
                <input type="hidden" name="campaign_id" value={id} />
                <Button type="submit" variant="danger">
                  {t.clip.finishBtn}
                </Button>
              </form>
            )}
          </div>
          {c.status !== 'finished' && <p className="mt-2 text-xs text-text-faint">{t.clip.finishHint}</p>}

          {/* ── Отчёт ── */}
          <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              [t.clip.deliveredViewsLabel, deliveredViews],
              [t.clip.spentLabel, `${c.budget_spent} $`],
              [t.clip.budgetLeftLabel, `${available} $`],
              [t.clip.actualCpmLabel, actualCpm ? `${actualCpm.toFixed(2)} $` : '—'],
              [t.clip.clipsCountLabel, approved.length],
              [t.clip.medianViewsLabel, Math.round(medianViews)],
            ].map(([label, value]) => (
              <Card key={String(label)} className="p-4">
                <p className="text-meta text-text-faint">{label}</p>
                <p className="mt-1 text-title tabular text-text">{value}</p>
              </Card>
            ))}
          </section>

          {/* ── Лучшие ролики ── */}
          <section className="mt-10">
            <h2 className="text-title text-text">{t.clip.topClipsTitle}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {topClips.length === 0 && <p className="text-sm text-text-faint">—</p>}
              {topClips.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent hover:underline">
                    {s.url}
                  </a>
                  <span className="tabular text-text">{s.views_total}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Использования звука ── */}
          {c.track_sound_url && (
            <section className="mt-10">
              <h2 className="text-title text-text">{t.clip.soundUsageTitle}</h2>
              <div className="mt-4 flex flex-col gap-2">
                {(soundUsage as SoundUsageSnapshot[] | null)?.length ? (
                  (soundUsage as SoundUsageSnapshot[]).map((s) => (
                    <div key={s.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                      <span className="text-text-dim">{formatDate(s.checked_at, locale)}</span>
                      <span className="tabular text-text">
                        {s.videos_count} {t.clip.soundUsageLabel.toLowerCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-faint">—</p>
                )}
              </div>
            </section>
          )}

          {/* ── Пополнение ── */}
          <section className="mt-10 border-t border-border pt-8">
            <h2 className="text-title text-text">{t.clip.depositTitle}</h2>
            <p className="mt-1 text-sm text-text-faint">{t.clip.depositHint}</p>
            <form action={requestDepositAction} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="campaign_id" value={id} />
              <Field label={t.clip.depositAmountLabel}>
                <input className={inputClass} name="amount" type="number" step="0.01" min="0.01" required />
              </Field>
              <Button type="submit" variant="artist">
                {t.clip.depositBtn}
              </Button>
            </form>

            <div className="mt-6 flex flex-col gap-2">
              <p className="text-meta text-text-faint">{t.clip.depositsHistoryTitle}</p>
              {((deposits ?? []) as ClientDeposit[]).length === 0 && <p className="text-sm text-text-faint">—</p>}
              {((deposits ?? []) as ClientDeposit[]).map((d) => (
                <div key={d.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                  <span className="text-text-dim">{formatDate(d.created_at, locale)}</span>
                  <span className="tabular text-text">{d.amount} $</span>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          </section>
        </Container>
      </main>
    </>
  );
}
