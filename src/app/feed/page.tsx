import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { EmptyState } from '@/components/ui';
import { Clapperboard, Music2 } from 'lucide-react';
import { Container, Grid } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/avatar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
import type { Campaign } from '@/lib/types';

// Лента открытых клиппинг-кампаний (Этап 3). Видны кампании в статусах
// funded/active — campaigns_select уже отдаёт их (см.
// supabase/migrations/0003_clipping_platform.sql).
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'editor' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: campaignsRaw } = await supabase
    .from('campaigns')
    .select('*')
    .in('status', ['funded', 'active'])
    .order('created_at', { ascending: false });

  const clientIds = [...new Set((campaignsRaw ?? []).map((c) => c.artist_id))];
  const { data: clientProfiles } = clientIds.length
    ? await supabase.from('profiles_public').select('id, display_name, avatar_url').in('id', clientIds)
    : { data: [] as { id: string; display_name: string; avatar_url: string | null }[] };
  const clientById = new Map((clientProfiles ?? []).map((p) => [p.id, p]));
  const campaigns = (campaignsRaw ?? []).map((c) => ({
    ...c,
    profiles: clientById.get(c.artist_id) ?? null,
  }));

  const pending = profile?.editor_status === 'pending';
  const rejected = profile?.editor_status === 'rejected';

  type FeedCampaign = Campaign & { id: string; profiles: { display_name: string; avatar_url: string | null } | null };
  const list = campaigns as FeedCampaign[];

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container>
          <Grid>
            <aside className="flex flex-col gap-6 md:col-span-3 md:sticky md:top-24 md:self-start">
              <div>
                <p className="text-display-sm tabular text-text">{list.length}</p>
                <p className="mt-1 text-meta text-text-faint">{t.clip.feedTitle}</p>
              </div>

              {error && (
                <p className="border-l-2 border-[var(--danger-tint-border)] pl-3 text-xs text-danger">
                  {decodeURIComponent(error)}
                </p>
              )}
              {pending && (
                <div className="border-l-2 border-[var(--warning-tint-border)] pl-3">
                  <p className="text-meta text-warning">{t.clip.pendingTitle}</p>
                  <p className="mt-1 text-xs text-warning">{t.clip.pendingMsg}</p>
                </div>
              )}
              {rejected && (
                <p className="border-l-2 border-[var(--danger-tint-border)] pl-3 text-xs text-danger">
                  {t.clip.rejectedMsg}
                </p>
              )}
            </aside>

            <div className="md:col-span-9">
              <h1 className="text-headline text-text">{t.clip.feedTitle}</h1>
              <p className="mt-1 text-body text-text-dim">{t.clip.feedSubtitle}</p>

              <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.length === 0 && (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState icon={Clapperboard} text={t.clip.noCampaigns} />
                  </div>
                )}
                {list.map((c) => {
                  const available = Math.max(c.budget_total - c.budget_reserved - c.budget_spent, 0);
                  const slotsLeft = c.per_clip_cap ? Math.floor(available / c.per_clip_cap) : null;
                  return (
                    <article
                      key={c.id}
                      className="relative flex min-h-[240px] flex-col rounded-[4px] border border-border bg-surface p-4 transition-colors hover:border-accent/60"
                    >
                      <Link href={`/feed/${c.id}`} aria-label={c.title} className="absolute inset-0 rounded-[4px]" />

                      <div className="flex items-start justify-between gap-2">
                        <Avatar url={c.profiles?.avatar_url ?? null} name={c.profiles?.display_name ?? '?'} size={32} />
                        <StatusBadge status={c.status} />
                      </div>

                      <h2 className="mt-3 line-clamp-2 text-title text-text">{c.title}</h2>
                      {c.profiles?.display_name && (
                        <p className="mt-1 truncate text-xs text-text-faint">
                          {t.clip.clientLabel}: {c.profiles.display_name}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-2 text-sm text-text-dim">{c.description}</p>

                      <div className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-4 text-xs text-text-faint">
                        {c.cpm_rate != null && (
                          <span className="text-base tabular text-text">
                            {c.cpm_rate} $ <span className="text-xs text-text-faint">/ {t.clip.cpmLabel}</span>
                          </span>
                        )}
                        {slotsLeft !== null && <span>{t.clip.slotsLeftLabel}: {slotsLeft}</span>}
                        {c.track_sound_url && (
                          <a
                            href={c.track_sound_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative z-10 inline-flex items-center gap-1 font-semibold text-text-dim transition hover:text-text"
                          >
                            <Music2 size={13} strokeWidth={1.75} aria-hidden="true" /> {t.clip.soundLabel}
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </Grid>
        </Container>
      </main>
    </>
  );
}
