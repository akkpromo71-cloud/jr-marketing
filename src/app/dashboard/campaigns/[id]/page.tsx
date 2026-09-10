import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, LinkButton, Field, inputClass, BackLink, EmptyState, RatingInput } from '@/components/ui';
import { Eye, Star, MessageCircle } from 'lucide-react';
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
import { PublishGuide } from '@/components/publish-guide';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber, formatDate } from '@/lib/format';
import { campaignIsEditable } from '@/lib/campaign-editable';
import { TELEGRAM_URL } from '@/lib/contacts';
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();

  const c = campaign as Campaign;
  const isOwner = profile?.id === c.artist_id;
  const isAdmin = profile?.role === 'admin';
  if (!isOwner && !isAdmin) notFound();

  // Правка доступна владельцу, пока кампания открыта и нет принятой заявки —
  // ту же проверку повторяют /edit и updateCampaignAction.
  const editable = isOwner && (await campaignIsEditable(supabase, id, c.status));

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container>
          <BackLink href={isAdmin ? '/admin' : '/dashboard'} label={t.common.back} />

          {saved === '1' && (
            <p className="mb-4 border-l-2 border-[var(--success-tint-border)] pl-3 text-xs text-success">
              {t.campaignDetail.editSavedMsg}
            </p>
          )}
          {error && (
            <p className="mb-4 border-l-2 border-[var(--danger-tint-border)] pl-3 text-xs text-danger">
              {decodeURIComponent(error)}
            </p>
          )}

          <Grid className="mt-2">
            {/* Левая колонка — мета кампании и управляющие действия. Раньше
                была sticky, но с брифом, оплатой и действиями она стала выше
                экрана: у sticky-блока выше вьюпорта нижняя часть недостижима
                при прокрутке, поэтому колонка теперь обычная. */}
            <div className="md:col-span-4">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-headline text-text">{c.title}</h1>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-3 text-body text-text-dim">{c.description}</p>

              {c.deadline && (
                <p className="mt-3 text-sm text-text-faint">
                  {t.campaignDetail.deadlineLabel}:{' '}
                  <span className="text-text-dim">{formatDate(c.deadline, locale)}</span>
                </p>
              )}

              {/* Публикует ролик эдитор, не артист — подпись сверху, чтобы
                  блок не читался как инструкция самому артисту. */}
              <div className="mt-4">
                <p className="mb-1.5 text-meta text-text-faint">
                  {t.campaignDetail.publishGuideForEditor}
                </p>
                <PublishGuide
                  caption={`${c.track_title_for_caption ?? c.title}${
                    c.artist_handle ? ` ${c.artist_handle}` : ''
                  }`}
                  labels={t.publishGuide}
                />
              </div>

              {(c.track_segment || (c.reference_urls?.length ?? 0) > 0 || c.restrictions) && (
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

              {/* Заметка админа по кампании — раньше её видел только эдитор в
                  ленте. Админу её тут не дублируем: ниже у него форма правки. */}
              {c.manager_message && !isAdmin && (
                <div className="mt-4 rounded-[4px] border border-[var(--accent-tint-border)] bg-[var(--accent-tint-bg)] px-4 py-3">
                  <p className="text-meta text-accent">{t.campaignDetail.teamMessageLabel}</p>
                  <p className="mt-1 text-sm text-text-dim">{c.manager_message}</p>
                </div>
              )}

              {isOwner && c.status === 'open' && (
                <div className="mt-5">
                  {editable ? (
                    <LinkButton href={`/dashboard/campaigns/${c.id}/edit`} variant="secondary">
                      {t.campaignDetail.editBtn}
                    </LinkButton>
                  ) : (
                    <p className="text-xs text-text-faint">{t.campaignDetail.editLockedHint}</p>
                  )}
                </div>
              )}

              {c.status === 'open' && (
                <form id="close-campaign-form" action={closeCampaignAction} className="mt-5">
                  <input type="hidden" name="campaign_id" value={c.id} />
                  <p className="mb-2 text-xs text-text-faint">{t.campaignDetail.closeApplicationsHint}</p>
                  <Button type="submit" variant="secondary">
                    {t.campaignDetail.closeApplicationsBtn}
                  </Button>
                </form>
              )}

              {/* Оплата и связь с командой — только владельцу кампании. */}
              {isOwner && (
                <>
                  <div className="mt-6 rounded-[4px] border border-border p-4">
                    <p className="text-meta text-text-faint">{t.campaignDetail.payoutTitle}</p>
                    <ul className="mt-2 flex flex-col gap-1.5 text-sm text-text-dim">
                      <li>{t.campaignDetail.payoutWhat}</li>
                      <li>{t.campaignDetail.payoutHow}</li>
                      <li>{t.campaignDetail.payoutWhen}</li>
                      <li>{t.campaignDetail.payoutConfirm}</li>
                    </ul>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-text-faint">{t.campaignDetail.contactHint}</p>
                    <a
                      href={TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded border border-border px-4 py-2 text-xs font-semibold text-text-dim transition hover:border-accent/50 hover:text-text"
                    >
                      <MessageCircle size={14} strokeWidth={1.75} aria-hidden="true" />
                      {t.campaignDetail.contactTeam}
                    </a>
                  </div>
                </>
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

      {/* Подтверждение перед закрытием приёма откликов — действие необратимое.
          Чистый JS без React-состояния, тот же приём, что в
          src/app/dashboard/new/page.tsx: страница остаётся серверной. */}
      {c.status === 'open' && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var form = document.getElementById('close-campaign-form');
                if (!form) return;
                form.addEventListener('submit', function (e) {
                  if (!window.confirm(${JSON.stringify(t.campaignDetail.closeApplicationsConfirm)})) {
                    e.preventDefault();
                  }
                });
              })();
            `,
          }}
        />
      )}
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

  // Готовые работы: артист платит за ролики и должен их видеть, а не только
  // суммарные цифры. RLS applications_select пускает владельца кампании к её
  // заявкам, имя эдитора берём из profiles_public (там только имя/аватар/био —
  // без контактов). Ролик и так публикуется на аккаунте эдитора.
  const { data: worksRaw } = await supabase
    .from('applications')
    .select('id, editor_id, posted_url, views_count, likes_count, result_updated_at, created_at')
    .eq('campaign_id', campaignId)
    .in('status', ['delivered', 'completed'])
    .order('created_at', { ascending: false });

  type Work = Pick<
    Application,
    'id' | 'editor_id' | 'posted_url' | 'views_count' | 'likes_count' | 'result_updated_at' | 'created_at'
  >;
  const works = (worksRaw ?? []) as Work[];

  const editorIds = [...new Set(works.map((w) => w.editor_id))];
  const { data: editorRows } = editorIds.length
    ? await supabase.from('profiles_public').select('id, display_name').in('id', editorIds)
    : { data: [] as { id: string; display_name: string }[] };
  const editorNameById = new Map((editorRows ?? []).map((p) => [p.id, p.display_name]));

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

      <div className="mt-10">
        <p className="text-meta text-text-faint">{t.campaignDetail.worksTitle}</p>
        {works.length === 0 ? (
          <p className="mt-3 text-sm text-text-faint">{t.campaignDetail.worksEmpty}</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {works.map((w) => (
              <li
                key={w.id}
                className="flex flex-col gap-2 border-t border-border py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-text">{editorNameById.get(w.editor_id) ?? '—'}</p>
                  {w.posted_url ? (
                    <a
                      href={w.posted_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block text-sm text-accent hover:underline"
                    >
                      {t.applicationDetail.viewPostedEdit}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-xs text-text-faint">{t.campaignDetail.worksNoLink}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-text-faint">
                  {w.views_count != null && (
                    <span>
                      <span className="tabular text-text">{formatCompactNumber(w.views_count, locale)}</span>{' '}
                      {t.applicationDetail.viewsLabel}
                    </span>
                  )}
                  {w.likes_count != null && (
                    <span>
                      <span className="tabular text-text">{formatCompactNumber(w.likes_count, locale)}</span>{' '}
                      {t.applicationDetail.likesLabel}
                    </span>
                  )}
                  <span>{formatDate(w.result_updated_at ?? w.created_at, locale)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
        {apps.length === 0 && <EmptyState icon={Eye} text={t.campaignDetail.noResponses} />}
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
                  <div className="mt-1 flex gap-0.5 text-accent" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        size={14}
                        strokeWidth={1.5}
                        className={s < r.rating ? 'fill-current' : 'opacity-30'}
                      />
                    ))}
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
