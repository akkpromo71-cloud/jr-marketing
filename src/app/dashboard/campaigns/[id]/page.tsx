import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, Field, inputClass, BackLink, EmptyState, RatingInput } from '@/components/ui';
import { Container, Grid } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/avatar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import {
  closeCampaignAction,
  updateCampaignMessageAction,
  submitArtistReviewAction,
  toggleReviewPublishedAction,
} from '@/app/dashboard/actions';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber } from '@/lib/format';
import type { Application, Campaign, Profile } from '@/lib/types';

interface CampaignReport {
  applications_count: number;
  accepted_count: number;
  completed_count: number;
  total_views: number;
  total_likes: number;
  total_spent: number;
  edits_count: number;
}

interface EditorAvgViews {
  editor_id: string;
  avg_views: number | null;
  completed_count: number;
}

interface Review {
  id: string;
  campaign_id: string;
  application_id: string | null;
  author_role: 'artist' | 'editor';
  rating: number;
  comment: string | null;
  is_published: boolean;
}

// Строка «ведомости» отчёта — meta-лейбл слева, число справа. big=true —
// доминирующая метрика (суммарный охват), дисплейный размер.
function LedgerRow({ label, value, big = false }: { label: string; value: string | number; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-4">
      <span className="text-meta text-text-faint">{label}</span>
      <span className={big ? 'text-display-sm tabular text-text' : 'text-xl tabular text-text'}>{value}</span>
    </div>
  );
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();

  const c = campaign as Campaign;
  const isOwner = profile?.id === c.artist_id;
  const isAdmin = profile?.role === 'admin';
  if (!isOwner && !isAdmin) notFound();

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container>
          <BackLink href={isAdmin ? '/admin' : '/dashboard'} label={t.common.back} />
          <Grid className="mt-2">
            {/* Левая колонка — мета кампании и управляющие действия. */}
            <div className="md:col-span-4 md:sticky md:top-24 md:self-start">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-headline text-text">{c.title}</h1>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-3 text-body text-text-dim">{c.description}</p>

              {c.status === 'open' && (
                <form action={closeCampaignAction} className="mt-5">
                  <input type="hidden" name="campaign_id" value={c.id} />
                  <Button type="submit" variant="secondary">
                    {t.campaignDetail.closeApplicationsBtn}
                  </Button>
                </form>
              )}

              {isAdmin && (
                <Card className="mt-6 p-5">
                  <form action={updateCampaignMessageAction} className="flex flex-col gap-3">
                    <input type="hidden" name="campaign_id" value={c.id} />
                    <Field label={t.campaignDetail.managerMessageLabel}>
                      <textarea
                        className={inputClass}
                        name="manager_message"
                        rows={3}
                        defaultValue={c.manager_message ?? ''}
                        placeholder={t.campaignDetail.managerMessagePlaceholder}
                      />
                    </Field>
                    <Button type="submit" variant="secondary" className="self-start">
                      {t.campaignDetail.saveMessageBtn}
                    </Button>
                  </form>
                </Card>
              )}
            </div>

            {/* Правая колонка — отчёт / отклики. */}
            <div className="md:col-span-8">
              {isAdmin ? (
                <>
                  <AdminApplications campaignId={id} budget={c.budget} />
                  <ReviewsAdminPanel campaignId={id} />
                </>
              ) : (
                <ArtistReport campaignId={id} />
              )}
            </div>
          </Grid>
        </Container>
      </main>
    </>
  );
}

// Артист видит только сводку результатов — вертикальная «ведомость», где
// суммарный охват доминирует по размеру (REDESIGN_PLAN.md §5.3).
async function ArtistReport({ campaignId }: { campaignId: string }) {
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data } = await supabase.rpc('get_campaign_report', { p_campaign_id: campaignId });
  const report = (Array.isArray(data) ? data[0] : data) as CampaignReport | undefined;

  const { data: existingReview } = await supabase
    .from('reviews')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('author_role', 'artist')
    .maybeSingle();

  return (
    <>
      <p className="text-meta text-text-faint">{t.campaignDetail.reportTitle}</p>
      <p className="mt-2 max-w-container-text text-body text-text-dim">{t.campaignDetail.reportHint}</p>

      <dl className="mt-8">
        <LedgerRow label={t.campaignDetail.totalViewsLabel} value={formatCompactNumber(report?.total_views ?? 0, locale)} big />
        <LedgerRow label={t.campaignDetail.totalLikesLabel} value={formatCompactNumber(report?.total_likes ?? 0, locale)} />
        <LedgerRow label={t.campaignDetail.reportApplicationsLabel} value={report?.applications_count ?? 0} />
        <LedgerRow label={t.campaignDetail.reportAssignedLabel} value={report?.accepted_count ?? 0} />
        <LedgerRow label={t.campaignDetail.reportCompletedLabel} value={report?.completed_count ?? 0} />
        <LedgerRow label={t.campaignDetail.editsCountLabel} value={report?.edits_count ?? 0} />
        <LedgerRow label={t.campaignDetail.totalSpentLabel} value={`${report?.total_spent ?? 0} $`} />
      </dl>

      {(report?.completed_count ?? 0) > 0 && (
        <Card className="mt-8 p-6">
          {existingReview ? (
            <p className="text-sm text-text-dim">{t.reviewForm.alreadySubmitted}</p>
          ) : (
            <form action={submitArtistReviewAction} className="flex flex-col gap-4">
              <input type="hidden" name="campaign_id" value={campaignId} />
              <p className="text-meta text-text-faint">{t.reviewForm.artistTitle}</p>
              <RatingInput label={t.reviewForm.ratingLabel} />
              <Field label={t.reviewForm.commentLabel}>
                <textarea
                  className={inputClass}
                  name="comment"
                  rows={3}
                  placeholder={t.reviewForm.commentPlaceholder}
                />
              </Field>
              <Button type="submit" variant="primary" className="self-start">
                {t.reviewForm.submitBtn}
              </Button>
            </form>
          )}
        </Card>
      )}
    </>
  );
}

// Полный список откликов с ссылками на каждую заявку — только для админа.
async function AdminApplications({ campaignId, budget }: { campaignId: string; budget: number | null }) {
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: applications } = await supabase
    .from('applications')
    .select('*, profiles(*)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  const apps = (applications ?? []) as (Application & { profiles: Profile })[];

  const editorIds = Array.from(new Set(apps.map((a) => a.profiles?.id).filter(Boolean))) as string[];
  const { data: avgViewsRows } = editorIds.length
    ? await supabase.rpc('get_editor_avg_views', { p_editor_ids: editorIds })
    : { data: [] as EditorAvgViews[] };
  const avgViewsMap = new Map(((avgViewsRows as EditorAvgViews[] | null) ?? []).map((r) => [r.editor_id, r]));

  const totalViews = apps.reduce((sum, a) => sum + (a.views_count ?? 0), 0);
  const committed = apps
    .filter((a) => a.status === 'accepted' || a.status === 'in_revision' || a.status === 'delivered' || a.status === 'completed')
    .reduce((sum, a) => sum + (a.price ?? 0), 0);
  const remaining = budget != null ? budget - committed : null;

  return (
    <>
      {totalViews > 0 && (
        <div className="flex items-baseline justify-between gap-4 border-t border-border py-4">
          <span className="text-meta text-text-faint">{t.campaignDetail.totalViewsLabel}</span>
          <span className="text-display-sm tabular text-text">{formatCompactNumber(totalViews, locale)}</span>
        </div>
      )}

      {budget != null && (
        <Card className="mt-4 p-5">
          <p className="mb-3 text-meta text-text-faint">{t.campaignDetail.budgetSummaryTitle}</p>
          <div className="flex flex-wrap gap-6 text-sm">
            <p className="text-text">
              {t.campaignDetail.budgetTotalLabel}: <span className="font-medium">{budget} $</span>
            </p>
            <p className="text-text">
              {t.campaignDetail.budgetSpentLabel}: <span className="font-medium">{committed} $</span>
            </p>
            <p className="text-text">
              {t.campaignDetail.budgetLeftLabel}: <span className="font-medium text-accent">{remaining} $</span>
            </p>
          </div>
        </Card>
      )}

      <h2 className="mb-4 mt-10 text-meta text-text-faint">
        {t.campaignDetail.responses} ({apps.length})
      </h2>
      <div className="flex flex-col gap-4">
        {apps.length === 0 && <EmptyState icon="👀" text={t.campaignDetail.noResponses} />}
        {apps.map((a) => (
          <Link key={a.id} href={`/applications/${a.id}`}>
            <Card className="p-5 hover:border-accent/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar url={a.profiles?.avatar_url ?? null} name={a.profiles?.display_name ?? '?'} size={40} />
                  <div>
                    <h3 className="text-title text-text">{a.profiles?.display_name}</h3>
                    {a.price && (
                      <p className="mt-1 text-sm text-text-dim">
                        {t.applicationDetail.price}: {a.price} $
                      </p>
                    )}
                    {a.cover_note && <p className="mt-1 line-clamp-2 text-sm text-text-faint">{a.cover_note}</p>}
                    {(a.profiles?.followers != null || avgViewsMap.get(a.profiles?.id)?.avg_views != null) && (
                      <p className="mt-1 text-xs text-text-faint">
                        {a.profiles?.followers != null &&
                          `${t.admin.followersLabel}: ${formatCompactNumber(a.profiles.followers, locale)}`}
                        {a.profiles?.followers != null && avgViewsMap.get(a.profiles.id)?.avg_views != null && ' · '}
                        {avgViewsMap.get(a.profiles?.id)?.avg_views != null &&
                          `${t.admin.avgViewsLabel}: ${formatCompactNumber(
                            Math.round(avgViewsMap.get(a.profiles.id)!.avg_views!),
                            locale
                          )}`}
                      </p>
                    )}
                    {(a.profiles?.paypal_email || a.profiles?.crypto_wallet) && (
                      <p className="mt-1 text-xs text-text-faint">
                        {a.profiles.paypal_email
                          ? `${t.payout.paypal}: ${a.profiles.paypal_email}`
                          : `${t.payout.crypto}: ${a.profiles.crypto_wallet}`}
                      </p>
                    )}
                    {a.views_count != null && (
                      <p className="mt-1 text-xs font-semibold text-accent">
                        {formatCompactNumber(a.views_count, locale)} {t.campaignDetail.viewsShort}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

// Отзывы по кампании — админ решает, публиковать ли каждый на лендинге.
async function ReviewsAdminPanel({ campaignId }: { campaignId: string }) {
  const supabase = await createClient();
  const { t } = await getDict();

  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  const reviews = (data ?? []) as Review[];

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-meta text-text-faint">{t.reviewAdmin.title}</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-text-faint">{t.reviewAdmin.noReviews}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-meta text-text-faint">
                    {r.author_role === 'artist' ? t.reviewAdmin.artistLabel : t.reviewAdmin.editorLabel}
                  </p>
                  <div className="mt-1 text-accent" aria-hidden="true">
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-text-dim">«{r.comment}»</p>}
                </div>
                {r.is_published && (
                  <span className="rounded-full border border-[var(--success-tint-border)] bg-[var(--success-tint-bg)] px-2.5 py-1 text-xs font-semibold text-success">
                    {t.reviewAdmin.publishedBadge}
                  </span>
                )}
              </div>
              <form action={toggleReviewPublishedAction} className="mt-3">
                <input type="hidden" name="review_id" value={r.id} />
                <input type="hidden" name="campaign_id" value={campaignId} />
                <input type="hidden" name="next_published" value={r.is_published ? '0' : '1'} />
                <Button type="submit" variant="secondary">
                  {r.is_published ? t.reviewAdmin.unpublishBtn : t.reviewAdmin.publishBtn}
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
