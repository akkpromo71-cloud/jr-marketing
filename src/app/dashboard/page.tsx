import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, LinkButton, StatusBadge, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber } from '@/lib/format';
import type { Campaign } from '@/lib/types';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; welcome?: string }>;
}) {
  const { created, welcome } = await searchParams;
  const profile = await getCurrentProfile();
  // Эта страница только для артистов (и админа, который может подглядывать) —
  // эдитора, который сюда случайно попал, отправляем на его настоящую домашнюю страницу.
  if (profile && profile.role !== 'artist' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: campaigns } = profile
    ? await supabase
        .from('campaigns')
        .select('*, applications(count)')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const active = (campaigns ?? []).filter((c: Campaign) => c.status !== 'completed' && c.status !== 'closed');
  const finished = (campaigns ?? []).filter((c: Campaign) => c.status === 'completed' || c.status === 'closed');

  // Суммарный охват по всем трекам артиста сразу — берём результаты, которые
  // эдиторы внесли по своим заявкам на все кампании этого артиста.
  type ResultRow = { views_count: number | null; posted_url: string | null };
  const campaignIds = (campaigns ?? []).map((c: Campaign) => c.id);
  const { data: resultRowsRaw } = campaignIds.length
    ? await supabase.from('applications').select('views_count, posted_url').in('campaign_id', campaignIds)
    : { data: [] as ResultRow[] };
  const resultRows = (resultRowsRaw ?? []) as ResultRow[];

  const totalViews = resultRows.reduce((sum: number, r: ResultRow) => sum + (r.views_count ?? 0), 0);
  const editsCount = resultRows.filter((r: ResultRow) => r.posted_url || r.views_count != null).length;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-text">{t.dashboard.title}</h1>
            <p className="mt-1 text-sm text-text-dim">{t.dashboard.subtitle}</p>
          </div>
          <LinkButton href="/dashboard/new" variant="primary">
            {t.dashboard.newTrackBtn}
          </LinkButton>
        </div>

        {welcome === 'artist' && (
          <div className="mt-6 rounded-xl border border-[var(--success-tint-border)] bg-[var(--success-tint-bg)] px-4 py-3 text-sm text-success">
            {t.dashboard.welcomeArtist}
          </div>
        )}
        {created === '1' && (
          <div className="mt-6 rounded-xl border border-[var(--success-tint-border)] bg-[var(--success-tint-bg)] px-4 py-3 text-sm text-success">
            {t.dashboard.createdMsg}
          </div>
        )}

        {totalViews > 0 && (
          <Card className="mt-8 flex flex-wrap items-center gap-10 p-6">
            <div>
              <p className="font-display text-4xl font-medium text-accent">
                {formatCompactNumber(totalViews, locale)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
                {t.dashboard.totalViewsLabel}
              </p>
            </div>
            <div>
              <p className="font-display text-4xl font-medium text-text">{editsCount}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
                {t.dashboard.editsCountLabel}
              </p>
            </div>
          </Card>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">{t.dashboard.activeLabel}</h2>
          <div className="flex flex-col gap-4">
            {active.length === 0 && <EmptyState icon="📁" text={t.dashboard.noActiveCampaigns} />}
            {active.map((c: Campaign & { applications: { count: number }[] }) => (
              <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
                <Card className="p-5 hover:-translate-y-0.5 hover:border-accent/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-medium text-text">{c.title}</h3>
                      <p className="mt-1 text-sm text-text-faint">
                        {t.dashboard.responses}: {c.applications?.[0]?.count ?? 0}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {finished.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">{t.dashboard.finishedLabel}</h2>
            <div className="flex flex-col gap-4">
              {finished.map((c: Campaign) => (
                <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
                  <Card className="p-5 opacity-80 hover:-translate-y-0.5 hover:opacity-100">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-display text-lg font-medium text-text">{c.title}</h3>
                      <StatusBadge status={c.status} />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
