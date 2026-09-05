import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, Field, inputClass, BackLink, EmptyState, RatingInput } from '@/components/ui';
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

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();

  const c = campaign as Campaign;
  const isOwner = profile?.id === c.artist_id;
  const isAdmin = profile?.role === 'admin';
  if (!isOwner && !isAdmin) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <BackLink href={isAdmin ? '/admin' : '/dashboard'} label={t.common.back} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-text">{c.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-text-dim">{c.description}</p>
          </div>
          <StatusBadge status={c.status} />
        </div>

        {c.status === 'open' && (
          <form action={closeCampaignAction} className="mt-4">
            <input type="hidden" name="campaign_id" value={c.id} />
            <Button type="submit" variant="secondary">
              {t.campaignDetail.closeApplicationsBtn}
            </Button>
          </form>
        )}

        {isAdmin ? (
          <>
            {/* Заметка для эдиторов ("сообщение от менеджера" в карточке трека) —
                видит и правит только админ, эдиторам показывается на /feed. */}
            <Card className="mt-6 p-5">
              <form action={updateCampaignMessageAction} className="flex flex-col gap-3">
                <input type="hidden" name="campaign_id" value={c.id} />
                <Field label={t.campaignDetail.managerMessageLabel}>
                  <textarea
                    className={inputClass}
                    name="manager_message"
                    rows={2}
                    defaultValue={c.manager_message ?? ''}
                    placeholder={t.campaignDetail.managerMessagePlaceholder}
                  />
                </Field>
                <Button type="submit" variant="secondary" className="self-start">
                  {t.campaignDetail.saveMessageBtn}
                </Button>
              </form>
            </Card>
            <AdminApplications campaignId={id} budget={c.budget} />
            <ReviewsAdminPanel campaignId={id} />
          </>
        ) : (
          <ArtistReport campaignId={id} />
        )}
      </main>
    </>
  );
}

// Артист бюджет и бриф передал команде — дальше подбором эдиторов занимаемся
// мы сами, поэтому вместо списка откликов артист видит только сводку
// результатов. Индивидуальные заявки (кто из эдиторов, по какой цене и т.д.)
// ему больше не показываем — эти данные и не запрашиваются с фронтенда,
// сводку считает функция get_campaign_report() в базе.
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
      <Card className="mt-10 p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
          {t.campaignDetail.reportTitle}
        </p>
        <p className="mb-5 text-sm text-text-dim">{t.campaignDetail.reportHint}</p>
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="font-display text-3xl font-medium text-accent">
              {formatCompactNumber(report?.total_views ?? 0, locale)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
              {t.campaignDetail.totalViewsLabel}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-medium text-text">
              {formatCompactNumber(report?.total_likes ?? 0, locale)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
              {t.campaignDetail.totalLikesLabel}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-medium text-text">{report?.applications_count ?? 0}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
              {t.campaignDetail.reportApplicationsLabel}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-medium text-text">{report?.accepted_count ?? 0}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
              {t.campaignDetail.reportAssignedLabel}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-medium text-text">{report?.completed_count ?? 0}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
              {t.campaignDetail.reportCompletedLabel}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-medium text-text">{report?.edits_count ?? 0}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
              {t.campaignDetail.editsCountLabel}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-medium text-text">{report?.total_spent ?? 0} $</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
              {t.campaignDetail.totalSpentLabel}
            </p>
          </div>
        </div>
      </Card>

      {/* Отзыв — только когда есть хоть один завершённый эдит, один отзыв на
          кампанию целиком (не на конкретного эдитора, см. комментарий в
          миграции reviews). */}
      {(report?.completed_count ?? 0) > 0 && (
        <Card className="mt-4 p-6">
          {existingReview ? (
            <p className="text-sm text-text-dim">{t.reviewForm.alreadySubmitted}</p>
          ) : (
            <form action={submitArtistReviewAction} className="flex flex-col gap-4">
              <input type="hidden" name="campaign_id" value={campaignId} />
              <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                {t.reviewForm.artistTitle}
              </p>
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

// Полный список откликов с ссылками на каждую заявку — только для
// администратора: он назначает эдиторов и ведёт переписку по правкам.
async function AdminApplications({ campaignId, budget }: { campaignId: string; budget: number | null }) {
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: applications } = await supabase
    .from('applications')
    .select('*, profiles(*)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  const apps = (applications ?? []) as (Application & { profiles: Profile })[];

  // Средние просмотры по прошлым эдитам каждого заявителя — тот же RPC, что
  // и в /admin, здесь только на эдиторов, откликнувшихся именно на эту кампанию.
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
        <Card className="mt-6 inline-flex flex-col p-5">
          <p className="font-display text-3xl font-medium text-accent">
            {formatCompactNumber(totalViews, locale)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
            {t.campaignDetail.totalViewsLabel}
          </p>
        </Card>
      )}

      {budget != null && (
        <Card className="mt-4 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
            {t.campaignDetail.budgetSummaryTitle}
          </p>
          <div className="flex flex-wrap gap-6 text-sm">
            <p className="text-text">
              {t.campaignDetail.budgetTotalLabel}: <span className="font-medium">{budget} $</span>
            </p>
            <p className="text-text">
              {t.campaignDetail.budgetSpentLabel}: <span className="font-medium">{committed} $</span>
            </p>
            <p className="text-text">
              {t.campaignDetail.budgetLeftLabel}:{' '}
              <span className="font-medium text-accent">{remaining} $</span>
            </p>
          </div>
        </Card>
      )}

      <h2 className="mt-10 mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
        {t.campaignDetail.responses} ({apps.length})
      </h2>
      <div className="flex flex-col gap-4">
        {apps.length === 0 && <EmptyState icon="👀" text={t.campaignDetail.noResponses} />}
        {apps.map((a) => (
          <Link key={a.id} href={`/applications/${a.id}`}>
            <Card className="p-5 hover:-translate-y-0.5 hover:border-accent/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar url={a.profiles?.avatar_url ?? null} name={a.profiles?.display_name ?? '?'} size={40} />
                  <div>
                    <h3 className="font-display text-lg font-medium text-text">{a.profiles?.display_name}</h3>
                    {a.price && (
                      <p className="mt-1 text-sm text-text-dim">
                        {t.applicationDetail.price}: {a.price} $
                      </p>
                    )}
                    {a.cover_note && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-faint">{a.cover_note}</p>
                    )}
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

// Отзывы по кампании (артиста и эдиторов, если уже оставлены) — админ решает,
// публиковать ли каждый на лендинге.
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
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
        {t.reviewAdmin.title}
      </h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-text-faint">{t.reviewAdmin.noReviews}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
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
