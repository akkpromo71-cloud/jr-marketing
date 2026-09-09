import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Button, Field, inputClass, EmptyState } from '@/components/ui';
import { Clapperboard, Music2, Headphones, MessageSquareText } from 'lucide-react';
import { Container, Grid } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/avatar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { applyToCampaignAction } from '@/app/feed/actions';
import { getDict } from '@/lib/i18n';
import type { Campaign, Application } from '@/lib/types';

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
  const { t } = await getDict();

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

  const { data: myApplications } = profile
    ? await supabase.from('applications').select('*').eq('editor_id', profile.id)
    : { data: [] as Application[] };

  const appliedCampaignIds = new Set((myApplications ?? []).map((a) => a.campaign_id));

  const pending = profile?.editor_status === 'pending';
  const rejected = profile?.editor_status === 'rejected';

  const payout = profile?.paypal_email
    ? { label: t.payout.paypal, value: profile.paypal_email }
    : profile?.crypto_wallet
      ? { label: t.payout.crypto, value: profile.crypto_wallet }
      : null;

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

              <div className="mt-8 flex flex-col gap-4">
                {list.length === 0 && <EmptyState icon={Clapperboard} text={t.feed.noOpenCampaigns} />}
                {list.map((c) => {
                  const already = appliedCampaignIds.has(c.id);
                  const canApply = profile?.role === 'editor' && !pending && !rejected;
                  // Приоритетная карточка — есть бюджет или заметка менеджера:
                  // крупнее, с акцентной засечкой, бюджет дисплейным размером.
                  const priority = !!c.budget || !!c.manager_message;

                  return (
                    <article
                      key={c.id}
                      className={`border border-border bg-surface ${
                        priority ? 'border-l-2 border-l-accent p-6 md:p-8' : 'p-5 md:max-w-3xl'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Avatar url={c.profiles?.avatar_url ?? null} name={c.profiles?.display_name ?? '?'} size={40} />
                          <div>
                            {priority && (
                              <p className="mb-1 text-meta text-text-faint">{t.feed.priorityLabel}</p>
                            )}
                            <h2 className={priority ? 'text-title text-text sm:text-headline' : 'text-title text-text'}>
                              {c.title}
                            </h2>
                            {c.profiles?.display_name && (
                              <p className="mt-0.5 text-xs text-text-faint">
                                {t.feed.artistLabel}: {c.profiles.display_name}
                              </p>
                            )}
                            <p className="mt-2 text-sm text-text-dim">{c.description}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <StatusBadge status={c.status} />
                          {c.budget && (
                            <p className="text-right">
                              <span className={priority ? 'block text-display-sm tabular text-text' : 'block text-lg tabular text-text'}>
                                {c.budget} $
                              </span>
                              <span className="text-micro uppercase text-text-faint">{t.feed.budgetLabel}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {(c.track_url || c.spotify_url) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {c.track_url && (
                            <a
                              href={c.track_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2/40 px-3 py-1.5 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                            >
                              <Music2 size={14} strokeWidth={1.75} aria-hidden="true" /> {t.feed.soundTiktok}
                            </a>
                          )}
                          {c.spotify_url && (
                            <a
                              href={c.spotify_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2/40 px-3 py-1.5 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                            >
                              <Headphones size={14} strokeWidth={1.75} aria-hidden="true" /> {t.feed.soundSpotify}
                            </a>
                          )}
                        </div>
                      )}

                      {c.manager_message && (
                        <div className="mt-4 flex gap-2.5 border border-[var(--accent-tint-border)] bg-[var(--accent-tint-bg)] px-4 py-3">
                          <MessageSquareText size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
                          <div>
                            <p className="text-meta text-accent">{t.feed.managerMessageLabel}</p>
                            <p className="mt-1 text-sm text-text-dim">{c.manager_message}</p>
                          </div>
                        </div>
                      )}

                      {already ? (
                        <p className="mt-4 text-sm text-text-faint">{t.feed.alreadyApplied}</p>
                      ) : canApply && !payout ? (
                        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5">
                          <p className="text-sm text-warning">{t.feed.noPayoutWarning}</p>
                          <Link
                            href="/settings"
                            className="self-start rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text active:scale-95"
                          >
                            {t.feed.goToSettings}
                          </Link>
                        </div>
                      ) : canApply && payout ? (
                        <form action={applyToCampaignAction} className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
                          <input type="hidden" name="campaign_id" value={c.id} />
                          <Field label={t.feed.coverNote}>
                            <textarea className={inputClass} name="cover_note" rows={2} placeholder={t.feed.coverNotePlaceholder} />
                          </Field>
                          <p className="text-xs text-text-faint">
                            {t.feed.applyPriceNote} {profile?.price_min ?? '—'} $. {t.feed.payoutWillArrive}{' '}
                            {payout.label}: {payout.value}. {t.feed.payoutHint}
                          </p>
                          <Button type="submit" variant="primary" className="self-start">
                            {t.feed.applyBtn}
                          </Button>
                        </form>
                      ) : null}
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
