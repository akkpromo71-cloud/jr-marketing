import { notFound } from 'next/navigation';
import { Card, Button, Field, inputClass, BackLink, RatingInput } from '@/components/ui';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/avatar';
import { TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import {
  updateApplicationStatusAction,
  submitDraftAction,
  requestRevisionAction,
  updateEditResultAction,
  submitEditorReviewAction,
} from '@/app/applications/[id]/actions';
import { PublishGuide } from '@/components/publish-guide';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber, formatDate } from '@/lib/format';
import type { Application, Campaign, Profile, RevisionMessage } from '@/lib/types';

// Порядок работы: черновик -> приёмка -> публикация. Ролик выкладывается
// только после того, как работу приняли, поэтому правки больше не стоят
// эдитору снесённого поста (см. supabase/patch-draft-flow.sql).
export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: statusError } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { t, locale } = await getDict();

  const { data: application } = await supabase
    .from('applications')
    .select('*, campaigns(*)')
    .eq('id', id)
    .single();

  if (!application) notFound();

  const app = application as Application & { campaigns: Campaign };

  const { data: editorProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', app.editor_id)
    .single();

  // Артист сюда не заходит — отклики ведёт администратор, артист видит
  // сводный отчёт по кампании (src/app/dashboard/campaigns/[id]/page.tsx).
  const isEditor = profile?.id === app.editor_id;
  const isAdmin = profile?.role === 'admin';

  if (!isEditor && !isAdmin) notFound();

  const { data: revisionRows } = await supabase
    .from('revision_messages')
    .select('*')
    .eq('application_id', app.id)
    .order('created_at', { ascending: false });
  const revisions = (revisionRows ?? []) as RevisionMessage[];

  const { data: existingReview } = isEditor
    ? await supabase
        .from('reviews')
        .select('id')
        .eq('application_id', app.id)
        .eq('author_role', 'editor')
        .maybeSingle()
    : { data: null };

  const canSubmitDraft = isEditor && (app.status === 'accepted' || app.status === 'in_revision');
  const canPublish = isEditor && app.status === 'completed';

  return (
    <div>
      <BackLink
        href={isAdmin ? `/dashboard/campaigns/${app.campaign_id}` : '/applications'}
        label={t.common.back}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Avatar
            url={(editorProfile as Profile | null)?.avatar_url ?? null}
            name={(editorProfile as Profile | null)?.display_name ?? '?'}
            size={44}
          />
          <div>
            <h1 className="text-headline text-text">{app.campaigns?.title}</h1>
            <p className="mt-1 text-sm text-text-dim">
              {t.applicationDetail.editor}: {(editorProfile as Profile | null)?.display_name ?? '—'}
              {app.price ? ` · ${t.applicationDetail.price}: ${app.price} $` : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {app.campaigns?.deadline && (
        <p className="mt-4 text-sm text-text-faint">
          {t.applicationDetail.deadlineLabel}:{' '}
          <span className="text-text-dim">{formatDate(app.campaigns.deadline, locale)}</span>
        </p>
      )}

      {app.price != null && (
        <p className="mt-1 text-sm text-text-faint">{t.applicationDetail.payoutStage}</p>
      )}

      {(app.campaigns?.track_segment ||
        (app.campaigns?.reference_urls?.length ?? 0) > 0 ||
        app.campaigns?.restrictions) && (
        <dl className="mt-4 flex flex-col gap-3 rounded-[4px] border border-border p-4 text-sm">
          <p className="text-meta text-text-faint">{t.campaignDetail.briefTitle}</p>
          {app.campaigns.track_segment && (
            <div>
              <dt className="text-xs text-text-faint">{t.campaignDetail.segmentLabel}</dt>
              <dd className="mt-0.5 text-text-dim">{app.campaigns.track_segment}</dd>
            </div>
          )}
          {(app.campaigns.reference_urls?.length ?? 0) > 0 && (
            <div>
              <dt className="text-xs text-text-faint">{t.campaignDetail.referencesLabel}</dt>
              <dd className="mt-0.5 flex flex-col gap-1">
                {app.campaigns.reference_urls!.map((url) => (
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
          {app.campaigns.restrictions && (
            <div>
              <dt className="text-xs text-text-faint">{t.campaignDetail.restrictionsLabel}</dt>
              <dd className="mt-0.5 text-text-dim">{app.campaigns.restrictions}</dd>
            </div>
          )}
        </dl>
      )}

      {statusError && (
        <div className="mt-6 rounded-[4px] border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
          {decodeURIComponent(statusError)}
        </div>
      )}

      {app.cover_note && (
        <Card className="mt-6 p-5">
          <p className="text-meta text-text-faint">{t.applicationDetail.editorMessage}</p>
          <p className="mt-2 text-sm text-text">{app.cover_note}</p>
        </Card>
      )}

      {/* Правки от команды — видят и эдитор, и админ. */}
      {revisions.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="text-meta text-text-faint">{t.applicationDetail.revisionsTitle}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {revisions.map((r) => (
              <li key={r.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm text-text-dim">{r.body}</p>
                <p className="mt-1 text-xs text-text-faint">{formatDate(r.created_at, locale)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isAdmin && app.status === 'pending' && (
        <div className="mt-6 flex gap-3">
          <form action={updateApplicationStatusAction}>
            <input type="hidden" name="application_id" value={app.id} />
            <input type="hidden" name="status" value="accepted" />
            <Button type="submit" variant="primary">
              {t.applicationDetail.acceptBtn}
            </Button>
          </form>
          <form action={updateApplicationStatusAction}>
            <input type="hidden" name="application_id" value={app.id} />
            <input type="hidden" name="status" value="rejected" />
            <Button type="submit" variant="danger">
              {t.applicationDetail.rejectBtn}
            </Button>
          </form>
        </div>
      )}

      {/* Черновик, сданный на приёмку — ссылку видят и эдитор, и админ. */}
      {app.draft_url && (
        <p className="mt-6 text-sm">
          {t.applicationDetail.draftLabel}:{' '}
          <a
            href={app.draft_url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent hover:underline"
          >
            {app.draft_url}
          </a>
        </p>
      )}

      {/* Приёмка: принять работу или вернуть на правку с комментарием. */}
      {isAdmin && app.status === 'delivered' && (
        <Card className="mt-6 p-5">
          <form action={updateApplicationStatusAction}>
            <input type="hidden" name="application_id" value={app.id} />
            <input type="hidden" name="status" value="completed" />
            <Button type="submit" variant="primary">
              {t.applicationDetail.acceptWorkBtn}
            </Button>
          </form>
          <form action={requestRevisionAction} className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
            <input type="hidden" name="application_id" value={app.id} />
            <Field label={t.applicationDetail.revisionNoteLabel}>
              <textarea
                className={inputClass}
                name="revision_note"
                rows={3}
                required
                placeholder={t.applicationDetail.revisionNotePlaceholder}
              />
            </Field>
            <Button type="submit" variant="secondary" className="self-start">
              {t.applicationDetail.sendToRevisionBtn}
            </Button>
          </form>
        </Card>
      )}

      {/* Шаг 1 для эдитора: сдать черновик. Публиковать пока нельзя. */}
      {canSubmitDraft && (
        <Card className="mt-6 p-5">
          <p className="text-meta text-text-faint">
            {app.status === 'in_revision'
              ? t.applicationDetail.draftResubmitTitle
              : t.applicationDetail.draftFormTitle}
          </p>
          <p className="mt-1 text-xs text-text-faint">{t.applicationDetail.draftFormHint}</p>
          <form action={submitDraftAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="application_id" value={app.id} />
            <input
              className={`${inputClass} flex-1`}
              name="draft_url"
              type="url"
              required
              defaultValue={app.draft_url ?? ''}
              placeholder={t.applicationDetail.draftUrlPlaceholder}
            />
            <Button type="submit" variant="primary">
              {t.applicationDetail.sendBtn}
            </Button>
          </form>
        </Card>
      )}

      {isEditor && app.status === 'delivered' && (
        <p className="mt-6 text-sm text-text-faint">{t.applicationDetail.awaitingReview}</p>
      )}

      {/* Старые заявки: до появления черновиков эдитор сдавал сюда готовый ролик. */}
      {app.submission_url && (
        <p className="mt-4 text-sm">
          {t.applicationDetail.finishedWork}:{' '}
          <a
            href={app.submission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent hover:underline"
          >
            {app.submission_url}
          </a>
        </p>
      )}

      {/* Шаг 2 для эдитора: работа принята — публикуем и вносим ссылку на пост.
          Правило публикации живёт здесь, а не в ленте: оно нужно ровно в этот
          момент, а не когда эдитор выбирает трек. */}
      {canPublish && (
        <Card className="mt-6 p-5">
          <p className="text-meta text-text-faint">{t.applicationDetail.publishStepTitle}</p>
          <p className="mt-1 text-xs text-text-faint">{t.applicationDetail.publishStepHint}</p>

          <div className="mt-4">
            <PublishGuide
              caption={`${app.campaigns?.track_title_for_caption ?? app.campaigns?.title ?? ''}${
                app.campaigns?.artist_handle ? ` ${app.campaigns.artist_handle}` : ''
              }`}
              labels={t.publishGuide}
            />
          </div>

          <form action={updateEditResultAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="application_id" value={app.id} />
            <input type="hidden" name="campaign_id" value={app.campaign_id} />
            <input
              className={`${inputClass} flex-1`}
              name="posted_url"
              type="url"
              defaultValue={app.posted_url ?? ''}
              placeholder={t.applicationDetail.postedUrlPlaceholder}
            />
            <Button type="submit" variant="primary">
              {t.applicationDetail.updateResultBtn}
            </Button>
          </form>
        </Card>
      )}

      {app.posted_url && (
        <Card className="mt-6 p-6">
          <p className="mb-4 text-meta text-text-faint">{t.applicationDetail.resultTitle}</p>

          {app.post_missing && (
            <p className="mb-4 flex items-start gap-2 text-sm text-danger">
              <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
              {t.applicationDetail.postMissingLabel}
            </p>
          )}

          {app.views_count != null ? (
            <div className="flex flex-wrap items-end gap-10">
              <div>
                <p className="text-display-sm tabular text-accent">
                  {formatCompactNumber(app.views_count, locale)}
                </p>
                <p className="mt-1 text-meta text-text-faint">{t.applicationDetail.viewsLabel}</p>
              </div>
              {app.likes_count != null && (
                <div>
                  <p className="text-xl tabular text-text">
                    {formatCompactNumber(app.likes_count, locale)}
                  </p>
                  <p className="mt-1 text-meta text-text-faint">{t.applicationDetail.likesLabel}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-faint">{t.applicationDetail.noResultYet}</p>
          )}

          <a
            href={app.posted_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            {t.applicationDetail.viewPostedEdit}
          </a>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-faint">
            {app.result_updated_at && (
              <span>
                {t.applicationDetail.updatedAt}: {formatDate(app.result_updated_at, locale)}
              </span>
            )}
            {app.post_checked_at && (
              <span>
                {t.applicationDetail.postCheckedAt}: {formatDate(app.post_checked_at, locale)}
              </span>
            )}
          </div>
        </Card>
      )}

      {isEditor && app.status === 'completed' && (
        <Card className="mt-6 p-6">
          {existingReview ? (
            <p className="text-sm text-text-dim">{t.reviewForm.alreadySubmitted}</p>
          ) : (
            <form action={submitEditorReviewAction} className="flex flex-col gap-4">
              <input type="hidden" name="application_id" value={app.id} />
              <input type="hidden" name="campaign_id" value={app.campaign_id} />
              <p className="text-meta text-text-faint">{t.reviewForm.editorTitle}</p>
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
    </div>
  );
}
