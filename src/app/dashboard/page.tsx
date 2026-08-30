import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, LinkButton, StatusBadge } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
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
  const { t } = await getDict();

  const { data: campaigns } = profile
    ? await supabase
        .from('campaigns')
        .select('*, applications(count)')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] };

  const active = (campaigns ?? []).filter((c: Campaign) => c.status !== 'completed' && c.status !== 'closed');
  const finished = (campaigns ?? []).filter((c: Campaign) => c.status === 'completed' || c.status === 'closed');

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

        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">{t.dashboard.activeLabel}</h2>
          <div className="flex flex-col gap-4">
            {active.length === 0 && (
              <Card className="p-8 text-center text-sm text-text-faint">{t.dashboard.noActiveCampaigns}</Card>
            )}
            {active.map((c: Campaign & { applications: { count: number }[] }) => (
              <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
                <Card className="p-5 transition hover:border-accent/50">
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
                  <Card className="p-5 opacity-80 transition hover:opacity-100">
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
