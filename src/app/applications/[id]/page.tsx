import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, StatusBadge, inputClass } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import {
  postRevisionMessageAction,
  updateApplicationStatusAction,
  submitWorkAction,
} from '@/app/applications/[id]/actions';
import { getDict } from '@/lib/i18n';
import type { Application, Campaign, Profile, RevisionMessage } from '@/lib/types';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: application } = await supabase
    .from('applications')
    .select('*, campaigns(*)')
    .eq('id', id)
    .single();

  if (!application) notFound();

  const app = application as Application & { campaigns: Campaign };

  const { data: messages } = await supabase
    .from('revision_messages')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: true });

  const { data: editorProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', app.editor_id)
    .single();

  const isArtist = profile?.id === app.campaigns?.artist_id;
  const isEditor = profile?.id === app.editor_id;
  const isAdmin = profile?.role === 'admin';

  if (!isArtist && !isEditor && !isAdmin) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
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

        {isArtist && app.status === 'pending' && (
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

        {isArtist && app.status === 'delivered' && (
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

        <Card className="mt-8 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
            {t.applicationDetail.revisions}
          </p>
          <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1">
            {(messages ?? []).length === 0 && (
              <p className="text-sm text-text-faint">{t.applicationDetail.noMessages}</p>
            )}
            {(messages as RevisionMessage[] | null)?.map((m) => {
              const mine = m.author_id === profile?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl border px-4 py-2.5 text-sm ${
                      mine
                        ? 'border-[var(--accent-tint-border)] bg-[var(--accent-tint-bg)] text-text'
                        : 'border-border bg-surface2/40 text-text'
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })}
          </div>

          {(isArtist || isEditor) && (
            <form action={postRevisionMessageAction} className="mt-4 flex gap-3 border-t border-border pt-4">
              <input type="hidden" name="application_id" value={app.id} />
              <input
                className={`${inputClass} flex-1`}
                name="body"
                placeholder={t.applicationDetail.messagePlaceholder}
                required
              />
              <Button type="submit" variant="primary">
                {t.applicationDetail.sendMessageBtn}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </>
  );
}
