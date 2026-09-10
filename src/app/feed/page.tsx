import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { EmptyState } from '@/components/ui';
import { Clapperboard, Music2, Headphones } from 'lucide-react';
import { Container, Grid } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/avatar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import type { Campaign } from '@/lib/types';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; welcome?: string }>;
}) {
  const { error, welcome } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'editor' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t, locale } = await getDict();

  // Данные и запросы НЕ менялись (REDESIGN_PLAN.md §6) — только раскладка.
  const { data: campaignsRaw } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  const artistIds = [...new Set((campaignsRaw ?? []).map((c) => c.artist_id))];
  const { data: artistProfiles } = artistIds.length
    ? await supabase.from('profiles_public').select('id, display_name, avatar_url').in('id', artistIds)
    : { data: [] as { id: string; display_name: string; avatar_url: string | null }[] };
  const artistById = new Map((artistProfiles ?? []).map((p) => [p.id, p]));
  const campaigns = (campaignsRaw ?? []).map((c) => ({
    ...c,
    profiles: artistById.get(c.artist_id) ?? null,
  }));

  const pending = profile?.editor_status === 'pending';
  const rejected = profile?.editor_status === 'rejected';

  const statusText = pending
    ? t.status.pending
    : rejected
      ? t.status.rejected
      : profile?.role === 'editor'
        ? t.feed.statusReady
        : '—';

  type FeedCampaign = Campaign & { profiles: { display_name: string; avatar_url: string | null } | null };
  const list = campaigns as FeedCampaign[];

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container>
          <Grid>
            {/* Левый meta-рельс — «режим доски»: счётчик и собственный статус
                эдитора, алерты тонкими строками вместо широких плашек. */}
            <aside className="flex flex-col gap-6 md:col-span-3 md:sticky md:top-24 md:self-start">
              <div>
                <p className="text-display-sm tabular text-text">{list.length}</p>
                <p className="mt-1 text-meta text-text-faint">{t.feed.openTracksLabel}</p>
              </div>
              {profile?.role === 'editor' && (
                <div className="border-t border-border pt-4">
                  <p className="text-meta text-text-faint">{t.feed.yourStatusLabel}</p>
                  <p className="mt-1 text-sm text-text">{statusText}</p>
                </div>
              )}

              {welcome === 'editor' && (
                <p className="border-l-2 border-[var(--warning-tint-border)] pl-3 text-xs text-warning">
                  {t.feed.welcomeEditor}
                </p>
              )}
              {error && (
                <p className="border-l-2 border-[var(--danger-tint-border)] pl-3 text-xs text-danger">
                  {decodeURIComponent(error)}
                </p>
              )}
              {pending && !welcome && (
                <p className="border-l-2 border-[var(--warning-tint-border)] pl-3 text-xs text-warning">
                  {t.feed.pendingMsg}
                </p>
              )}
              {rejected && (
                <p className="border-l-2 border-[var(--danger-tint-border)] pl-3 text-xs text-danger">
                  {t.feed.rejectedMsg}
                </p>
              )}
            </aside>

            <div className="md:col-span-9">
              <h1 className="text-headline text-text">{t.feed.title}</h1>
              <p className="mt-1 text-body text-text-dim">{t.feed.subtitle}</p>

              {/* Сетка плиток: 3 колонки от 1280 (xl), 2 от 768 (sm→md), 1 на
                  мобильном. Вся плитка — одна ссылка на /feed/[id] через
                  растянутый Link (absolute inset-0); ссылка на звук поднята
                  над ним (relative z-10), поэтому вложенных <a> нет. Ховер
                  красит только рамку — сетка не дёргается. Одинаковая высота
                  в ряду — за счёт stretch + flex-col + mt-auto у нижней
                  строки, без жёсткого aspect-ratio. */}
              <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.length === 0 && (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState icon={Clapperboard} text={t.feed.noOpenCampaigns} />
                  </div>
                )}
                {list.map((c) => {
                  const sound = c.track_url
                    ? { href: c.track_url, Icon: Music2, label: t.feed.soundTiktok }
                    : c.spotify_url
                      ? { href: c.spotify_url, Icon: Headphones, label: t.feed.soundSpotify }
                      : null;

                  return (
                    <article
                      key={c.id}
                      className="relative flex min-h-[240px] flex-col rounded-[4px] border border-border bg-surface p-4 transition-colors hover:border-accent/60"
                    >
                      <Link
                        href={`/feed/${c.id}`}
                        aria-label={c.title}
                        className="absolute inset-0 rounded-[4px]"
                      />

                      <div className="flex items-start justify-between gap-2">
                        <Avatar url={c.profiles?.avatar_url ?? null} name={c.profiles?.display_name ?? '?'} size={32} />
                        <StatusBadge status={c.status} />
                      </div>

                      <h2 className="mt-3 line-clamp-2 text-title text-text">{c.title}</h2>
                      {c.profiles?.display_name && (
                        <p className="mt-1 truncate text-xs text-text-faint">
                          {t.feed.artistLabel}: {c.profiles.display_name}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-2 text-sm text-text-dim">{c.description}</p>

                      <div className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-4 text-xs text-text-faint">
                        {c.budget && <span className="text-base tabular text-text">{c.budget} $</span>}
                        {c.deadline && <span>{formatDate(c.deadline, locale)}</span>}
                        {sound && (
                          <a
                            href={sound.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative z-10 inline-flex items-center gap-1 font-semibold text-text-dim transition hover:text-text"
                          >
                            <sound.Icon size={13} strokeWidth={1.75} aria-hidden="true" /> {sound.label}
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
