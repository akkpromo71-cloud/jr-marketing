import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, StatusBadge, inputClass, BackLink } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import {
  updateApplicationStatusAction,
  submitWorkAction,
  updateEditResultAction,
} from '@/app/applications/[id]/actions';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber, formatDate } from '@/lib/format';
import type { Application, Campaign, Profile } from '@/lib/types';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Артист сюда больше не заходит — отклики ведёт администратор, артист видит
  // только сводный отчёт по кампании (src/app/dashboard/campaigns/[id]/page.tsx).
  const isEditor = profile?.id === app.editor_id;
  const isAdmin = profile?.role === 'admin';

  if (!isEditor && !isAdmin) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <BackLink
          href={isAdmin ? `/dashboard/campaigns/${app.campaign_id}` : '/applications'}
          label={t.common.back}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-text">{app.campaigns?.title}</h1>
            <p className="mt-1 text-sm text-text-dim">
              {t.applicationDetail.editor}: {(editorProfile as Profile | null)?.display_name ?? '—'}
              {app.price ? ` · ${t.applicationDetail.price}: ${app.price} $` : ''}
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {app.cover_note && (
          <Card className="mt-6 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              {t.applicationDetail.editorMessage}
            </p>
            <p className="mt-2 text-sm text-text">{app.cover_note}</p>
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

        {isAdmin && app.status === 'delivered' && (
          <div className="mt-6 flex gap-3">
            <form action={updateApplicationStatusAction}>
              <input type="hidden" name="application_id" value={app.id} />
              <input type="hidden" name="status" value="completed" />
              <Button type="submit" variant="primary">
                {t.applicationDetail.acceptWorkBtn}
              </Button>
            </form>
            <form action={updateApplicationStatusAction}>
              <input type="hidden" name="application_id" value={app.id} />
              <input type="hidden" name="status" value="in_revision" />
              <Button type="submit" variant="secondary">
                {t.applicationDetail.sendToRevisionBtn}
              </Button>
            </form>
          </div>
        )}

        {isEditor && (app.status === 'accepted' || app.status === 'in_revision') && (
          <Card className="mt-6 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
              {t.applicationDetail.submitWork}
            </p>
            <form action={submitWorkAction} className="flex gap-3">
              <input type="hidden" name="application_id" value={app.id} />
              <input
                className={`${inputClass} flex-1`}
                name="submission_url"
                placeholder={t.applicationDetail.submissionUrlPlaceholder}
                defaultValue={app.submission_url ?? ''}
                required
              />
              <Button type="submit" variant="primary">
                {t.applicationDetail.sendBtn}
              </Button>
            </form>
          </Card>
        )}

        {app.submission_url && (
          <p className="mt-4 text-sm">
            {t.applicationDetail.finishedWork}:{' '}
            <a href={app.submission_url} target="_blank" className="text-accent hover:underline">
              {app.submission_url}
            </a>
          </p>
        )}

        {isEditor && app.status !== 'pending' && app.status !== 'rejected' && (
          <Card className="mt-6 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              {t.applicationDetail.resultFormTitle}
            </p>
            <p className="mt-1 text-xs text-text-faint">{t.applicationDetail.resultFormHint}</p>
            <form action={updateEditResultAction} className="mt-4 flex gap-3">
              <input type="hidden" name="application_id" value={app.id} />
              <input type="hidden" name="campaign_id" value={app.campaign_id} />
              <input
                className={`${inputClass} flex-1`}
                name="posted_url"
                placeholder={t.applicationDetail.postedUrlPlaceholder}
                defaultValue={app.posted_url ?? ''}
              />
              <Button type="submit" variant="primary">
                {t.applicationDetail.updateResultBtn}
              </Button>
            </form>
          </Card>
        )}

        {app.posted_url && (
          <Card className="mt-6 p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
              {t.applicationDetail.resultTitle}
            </p>
            {app.views_count != null ? (
              <div className="flex flex-wrap items-end gap-8">
                <div>
                  <p className="font-display text-4xl font-medium text-accent">
                    {formatCompactNumber(app.views_count, locale)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
                    {t.applicationDetail.viewsLabel}
                  </p>
                </div>
                {app.likes_count != null && (
                  <div>
                    <p className="font-display text-2xl font-medium text-text">
                      {formatCompactNumber(app.likes_count, locale)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-text-faint">
                      {t.applicationDetail.likesLabel}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-faint">{t.applicationDetail.noResultYet}</p>
            )}
            <a
              href={app.posted_url}
              target="_blank"
              className="mt-4 inline-block text-sm text-accent hover:underline"
            >
              {t.applicationDetail.viewPostedEdit}
            </a>
            {app.result_updated_at && (
              <p className="mt-3 text-xs text-text-faint">
                {t.applicationDetail.updatedAt}: {formatDate(app.result_updated_at, locale)}
              </p>
            )}
          </Card>
        )}
      </main>
    </>
  );
}
