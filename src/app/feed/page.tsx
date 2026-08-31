import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, Field, inputClass, StatusBadge } from '@/components/ui';
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

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  const { data: myApplications } = profile
    ? await supabase.from('applications').select('*').eq('editor_id', profile.id)
    : { data: [] as Application[] };

  const appliedCampaignIds = new Set((myApplications ?? []).map((a) => a.campaign_id));

  const pending = profile?.editor_status === 'pending';
  const rejected = profile?.editor_status === 'rejected';

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
          {(campaigns ?? []).length === 0 && (
            <Card className="p-8 text-center text-sm text-text-faint">{t.feed.noOpenCampaigns}</Card>
          )}
          {(campaigns as Campaign[] | null)?.map((c) => {
            const already = appliedCampaignIds.has(c.id);
            return (
              <Card key={c.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-medium text-text">{c.title}</h2>
                    <p className="mt-1 text-sm text-text-dim">{c.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-faint">
                      {c.budget && (
                        <span>
                          {t.feed.budgetLabel}: {c.budget} $
                        </span>
                      )}
                      {c.track_url && (
                        <a href={c.track_url} target="_blank" className="text-accent hover:underline">
                          {t.feed.trackLink}
                        </a>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {already ? (
                  <p className="mt-4 text-sm text-text-faint">{t.feed.alreadyApplied}</p>
                ) : profile?.role === 'editor' && !pending && !rejected ? (
                  <form action={applyToCampaignAction} className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
                    <input type="hidden" name="campaign_id" value={c.id} />
                    <p className="text-xs text-text-faint">
                      {t.feed.yourPrice}: {profile?.price_min ?? '—'} $
                    </p>
                    <Field label={t.feed.coverNote}>
                      <textarea className={inputClass} name="cover_note" rows={2} placeholder={t.feed.coverNotePlaceholder} />
                    </Field>
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
