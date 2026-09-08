import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { LinkButton, EmptyState } from '@/components/ui';
import { Container, Grid } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber } from '@/lib/format';
import type { Campaign } from '@/lib/types';

// Засечка статуса слева от строки кампании — «пульт управления» считывается
// взглядом: активные — акцентная засечка, завершённые/закрытые — приглушённая.
function tickClass(status: string) {
  return status === 'completed' || status === 'closed'
    ? 'border-l-2 border-l-border'
    : 'border-l-2 border-l-accent';
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; welcome?: string }>;
}) {
  const { created, welcome } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'artist' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t, locale } = await getDict();

  // Данные и запросы НЕ менялись (REDESIGN_PLAN.md §6).
  const { data: campaigns } = profile
    ? await supabase
        .from('campaigns')
        .select('*, applications(count)')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const all = (campaigns ?? []) as (Campaign & { applications: { count: number }[] })[];
  const active = all.filter((c) => c.status !== 'completed' && c.status !== 'closed');
  const finished = all.filter((c) => c.status === 'completed' || c.status === 'closed');

  type ResultRow = { views_count: number | null; posted_url: string | null };
  const campaignIds = all.map((c) => c.id);
  const { data: resultRowsRaw } = campaignIds.length
    ? await supabase.from('applications').select('views_count, posted_url').in('campaign_id', campaignIds)
    : { data: [] as ResultRow[] };
  const resultRows = (resultRowsRaw ?? []) as ResultRow[];

  const totalViews = resultRows.reduce((sum, r) => sum + (r.views_count ?? 0), 0);
  const editsCount = resultRows.filter((r) => r.posted_url || r.views_count != null).length;

  const RailRow = ({ c }: { c: Campaign & { applications: { count: number }[] } }) => (
    <Link
      href={`/dashboard/campaigns/${c.id}`}
      className={`flex items-center justify-between gap-3 bg-surface py-3 pl-4 pr-3 transition hover:bg-surface2/20 ${tickClass(
        c.status
      )} ${c.status === 'completed' || c.status === 'closed' ? 'opacity-70' : ''}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm text-text">{c.title}</span>
        <span className="text-micro uppercase text-text-faint">
          {t.dashboard.responses}: {c.applications?.[0]?.count ?? 0}
        </span>
      </span>
      <StatusBadge status={c.status} />
    </Link>
  );

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container>
          <Grid>
            {/* Левый рельс — постоянный список кампаний артиста. */}
            <aside className="flex flex-col gap-3 md:col-span-4 md:sticky md:top-24 md:self-start">
              <div className="flex items-center justify-between">
                <h1 className="text-meta text-text-faint">{t.dashboard.campaignsRailLabel}</h1>
                <LinkButton href="/dashboard/new" variant="primary" className="!px-3 !py-1.5 text-xs">
                  {t.dashboard.newTrackBtn}
                </LinkButton>
              </div>

              {all.length === 0 && <EmptyState icon="📁" text={t.dashboard.noActiveCampaigns} />}

              {active.length > 0 && (
                <div className="flex flex-col border border-border">
                  {active.map((c) => (
                    <RailRow key={c.id} c={c} />
                  ))}
                </div>
              )}
              {finished.length > 0 && (
                <>
                  <p className="mt-2 text-micro uppercase text-text-faint">{t.dashboard.finishedLabel}</p>
                  <div className="flex flex-col border border-border">
                    {finished.map((c) => (
                      <RailRow key={c.id} c={c} />
                    ))}
                  </div>
                </>
              )}
            </aside>

            {/* Правая область — сводка по всем трекам (детали открываются в
                отдельной кампании). */}
            <div className="md:col-span-8">
              {welcome === 'artist' && (
                <p className="mb-6 border-l-2 border-[var(--success-tint-border)] pl-3 text-xs text-success">
                  {t.dashboard.welcomeArtist}
                </p>
              )}
              {created === '1' && (
                <p className="mb-6 border-l-2 border-[var(--success-tint-border)] pl-3 text-xs text-success">
                  {t.dashboard.createdMsg}
                </p>
              )}

              <h2 className="text-headline text-text">{t.dashboard.allTracksTitle}</h2>
              <p className="mt-2 text-body text-text-dim">{t.dashboard.allTracksHint}</p>

              {totalViews > 0 && (
                <dl className="mt-10 max-w-md">
                  <div className="flex items-baseline justify-between border-t border-border py-5">
                    <dt className="text-meta text-text-faint">{t.dashboard.totalViewsLabel}</dt>
                    <dd className="text-display-sm tabular text-text">
                      {formatCompactNumber(totalViews, locale)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-border py-5">
                    <dt className="text-meta text-text-faint">{t.dashboard.editsCountLabel}</dt>
                    <dd className="text-display-sm tabular text-text">{editsCount}</dd>
                  </div>
                </dl>
              )}
            </div>
          </Grid>
        </Container>
      </main>
    </>
  );
}
