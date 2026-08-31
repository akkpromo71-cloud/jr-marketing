import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Card, Button, Field, inputClass, StatusBadge, EmptyState } from '@/components/ui';
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

  // profiles(display_name) — имя артиста в карточке трека, как в мокапе:
  // "трек · артист" вместо голого названия кампании.
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, profiles(display_name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  const { data: myApplications } = profile
    ? await supabase.from('applications').select('*').eq('editor_id', profile.id)
    : { data: [] as Application[] };

  const appliedCampaignIds = new Set((myApplications ?? []).map((a) => a.campaign_id));

  const pending = profile?.editor_status === 'pending';
  const rejected = profile?.editor_status === 'rejected';

  // Куда придёт оплата за эдит — берём из профиля эдитора (см. /settings).
  // Без этого не даём откликаться: иначе площадка не будет знать, куда платить.
  const payout = profile?.paypal_email
    ? { label: t.payout.paypal, value: profile.paypal_email }
    : profile?.crypto_wallet
      ? { label: t.payout.crypto, value: profile.crypto_wallet }
      : null;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-3xl font-medium text-text">{t.feed.title}</h1>
        <p className="mt-1 text-sm text-text-dim">{t.feed.subtitle}</p>

        {welcome === 'editor' && (
          <div className="mt-6 rounded-xl border border-[var(--warning-tint-border)] bg-[var(--warning-tint-bg)] px-4 py-3 text-sm text-warning">
            {t.feed.welcomeEditor}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
            {decodeURIComponent(error)}
          </div>
        )}
        {pending && !welcome && (
          <div className="mt-6 rounded-xl border border-[var(--warning-tint-border)] bg-[var(--warning-tint-bg)] px-4 py-3 text-sm text-warning">
            {t.feed.pendingMsg}
          </div>
        )}
        {rejected && (
          <div className="mt-6 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
            {t.feed.rejectedMsg}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4">
          {(campaigns ?? []).length === 0 && <EmptyState icon="🎬" text={t.feed.noOpenCampaigns} />}
          {(campaigns as (Campaign & { profiles: { display_name: string } | null })[] | null)?.map((c) => {
            const already = appliedCampaignIds.has(c.id);
            const canApply = profile?.role === 'editor' && !pending && !rejected;
            return (
              <Card key={c.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-medium text-text">{c.title}</h2>
                    {c.profiles?.display_name && (
                      <p className="mt-0.5 text-xs text-text-faint">
                        {t.feed.artistLabel}: {c.profiles.display_name}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-text-dim">{c.description}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {/* Звук в TikTok / Spotify — отдельными кнопками, как ссылки на сам трек */}
                {(c.track_url || c.spotify_url) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {c.track_url && (
                      <a
                        href={c.track_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2/40 px-3 py-1.5 text-xs font-semibold text-text-dim transition hover:-translate-y-0.5 hover:border-accent/50 hover:text-text"
                      >
                        🎵 {t.feed.soundTiktok}
                      </a>
                    )}
                    {c.spotify_url && (
                      <a
                        href={c.spotify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2/40 px-3 py-1.5 text-xs font-semibold text-text-dim transition hover:-translate-y-0.5 hover:border-accent/50 hover:text-text"
                      >
                        🎧 {t.feed.soundSpotify}
                      </a>
                    )}
                    {c.budget && (
                      <span className="ml-auto text-xs text-text-faint">
                        {t.feed.budgetLabel}: {c.budget} $
                      </span>
                    )}
                  </div>
                )}
                {!c.track_url && !c.spotify_url && c.budget && (
                  <p className="mt-3 text-xs text-text-faint">
                    {t.feed.budgetLabel}: {c.budget} $
                  </p>
                )}

                {/* Сообщение от менеджера — заметка от администратора для эдиторов по этому треку */}
                {c.manager_message && (
                  <div className="mt-4 flex gap-2 rounded-xl border border-[var(--accent-tint-border)] bg-[var(--accent-tint-bg)] px-4 py-3">
                    <span aria-hidden="true">💬</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                        {t.feed.managerMessageLabel}
                      </p>
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
                      className="self-start rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-dim transition hover:-translate-y-0.5 hover:border-accent/50 hover:text-text active:scale-95"
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
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
