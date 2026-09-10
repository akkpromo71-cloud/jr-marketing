import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Button, Field, inputClass, BackLink } from '@/components/ui';
import { Music2, Headphones } from 'lucide-react';
import { Container } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/avatar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { applyToCampaignAction } from '@/app/feed/actions';
import { PublishGuide } from '@/components/publish-guide';
import { getDict } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import type { Campaign } from '@/lib/types';

// Страница кампании для эдитора: полный бриф + правило публикации + форма
// отклика. Лента (src/app/feed/page.tsx) — только сетка плиток, каждая ведёт
// сюда. Экшен applyToCampaignAction и RLS не менялись — форма просто переехала
// из карточки списка. Открытую кампанию видит любой авторизованный
// (политика campaigns_select), закрытую — только если эдитор уже откликнулся.
export default async function FeedCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'editor' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();
  const c = campaign as Campaign;

  const { data: artist } = await supabase
    .from('profiles_public')
    .select('display_name, avatar_url')
    .eq('id', c.artist_id)
    .maybeSingle();

  const { data: myApplication } = profile
    ? await supabase
        .from('applications')
        .select('id')
        .eq('editor_id', profile.id)
        .eq('campaign_id', c.id)
        .maybeSingle()
    : { data: null };

  const pending = profile?.editor_status === 'pending';
  const rejected = profile?.editor_status === 'rejected';
  const canApply = profile?.role === 'editor' && !pending && !rejected && c.status === 'open';

  const payout = profile?.paypal_email
    ? { label: t.payout.paypal, value: profile.paypal_email }
    : profile?.crypto_wallet
      ? { label: t.payout.crypto, value: profile.crypto_wallet }
      : null;

  const caption = `${c.track_title_for_caption ?? c.title}${c.artist_handle ? ` ${c.artist_handle}` : ''}`;
  const hasBrief = c.track_segment || (c.reference_urls?.length ?? 0) > 0 || c.restrictions;

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container width="text">
          <BackLink href="/feed" label={t.common.back} />

          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Avatar url={artist?.avatar_url ?? null} name={artist?.display_name ?? '?'} size={44} />
              <div>
                <h1 className="text-headline text-text">{c.title}</h1>
                {artist?.display_name && (
                  <p className="mt-1 text-sm text-text-faint">
                    {t.feed.artistLabel}: {artist.display_name}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={c.status} />
          </div>

          <p className="mt-6 whitespace-pre-line text-body text-text-dim">{c.description}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {c.budget && (
              <p>
                <span className="text-lg tabular text-text">{c.budget} $</span>{' '}
                <span className="text-micro uppercase text-text-faint">{t.feed.budgetLabel}</span>
              </p>
            )}
            {c.deadline && (
              <p className="text-sm text-text-faint">
                {t.feed.deadlineLabel}: <span className="text-text-dim">{formatDate(c.deadline, locale)}</span>
              </p>
            )}
          </div>

          {(c.track_url || c.spotify_url) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
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
            <div className="mt-4 border border-[var(--accent-tint-border)] bg-[var(--accent-tint-bg)] px-4 py-3">
              <p className="text-meta text-accent">{t.feed.managerMessageLabel}</p>
              <p className="mt-1 text-sm text-text-dim">{c.manager_message}</p>
            </div>
          )}

          {hasBrief && (
            <dl className="mt-4 flex flex-col gap-3 rounded-[4px] border border-border p-4 text-sm">
              <p className="text-meta text-text-faint">{t.campaignDetail.briefTitle}</p>
              {c.track_segment && (
                <div>
                  <dt className="text-xs text-text-faint">{t.campaignDetail.segmentLabel}</dt>
                  <dd className="mt-0.5 text-text-dim">{c.track_segment}</dd>
                </div>
              )}
              {(c.reference_urls?.length ?? 0) > 0 && (
                <div>
                  <dt className="text-xs text-text-faint">{t.campaignDetail.referencesLabel}</dt>
                  <dd className="mt-0.5 flex flex-col gap-1">
                    {c.reference_urls!.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-accent hover:underline"
                      >
                        {url}
                      </a>
                    ))}
                  </dd>
                </div>
              )}
              {c.restrictions && (
                <div>
                  <dt className="text-xs text-text-faint">{t.campaignDetail.restrictionsLabel}</dt>
                  <dd className="mt-0.5 text-text-dim">{c.restrictions}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-6">
            <PublishGuide caption={caption} labels={t.publishGuide} />
          </div>

          {myApplication ? (
            <p className="mt-6 border-t border-border pt-6 text-sm text-text-faint">{t.feed.alreadyApplied}</p>
          ) : canApply && !payout ? (
            <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
              <p className="text-sm text-warning">{t.feed.noPayoutWarning}</p>
              <Link
                href="/settings"
                className="self-start rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text active:scale-95"
              >
                {t.feed.goToSettings}
              </Link>
            </div>
          ) : canApply && payout ? (
            <form action={applyToCampaignAction} className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
              <input type="hidden" name="campaign_id" value={c.id} />
              <Field label={t.feed.coverNote}>
                <textarea
                  className={inputClass}
                  name="cover_note"
                  rows={3}
                  placeholder={t.feed.coverNotePlaceholder}
                />
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
        </Container>
      </main>
    </>
  );
}
