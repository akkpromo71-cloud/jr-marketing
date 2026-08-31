import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, StatusBadge } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { closeCampaignAction } from '@/app/dashboard/actions';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber } from '@/lib/format';
import type { Application, Campaign, Profile } from '@/lib/types';

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

  const { data: applications } = await supabase
    .from('applications')
    .select('*, profiles(*)')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false });

  const totalViews = ((applications ?? []) as Application[]).reduce(
    (sum: number, a: Application) => sum + (a.views_count ?? 0),
    0
  );

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-text">{c.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-text-dim">{c.description}</p>
          </div>
          <StatusBadge status={c.status} />
        </div>

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

        {c.status === 'open' && (
          <form action={closeCampaignAction} className="mt-4">
            <input type="hidden" name="campaign_id" value={c.id} />
            <Button type="submit" variant="secondary">
              {t.campaignDetail.closeApplicationsBtn}
            </Button>
          </form>
        )}

        <h2 className="mt-10 mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
          {t.campaignDetail.responses} ({applications?.length ?? 0})
        </h2>
        <div className="flex flex-col gap-4">
          {(applications ?? []).length === 0 && (
            <Card className="p-8 text-center text-sm text-text-faint">{t.campaignDetail.noResponses}</Card>
          )}
          {(applications as (Application & { profiles: Profile })[] | null)?.map((a) => (
            <Link key={a.id} href={`/applications/${a.id}`}>
              <Card className="p-5 transition hover:border-accent/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-medium text-text">
                      {a.profiles?.display_name}
                    </h3>
                    {a.price && (
                      <p className="mt-1 text-sm text-text-dim">
                        {t.applicationDetail.price}: {a.price} $
                      </p>
                    )}
                    {a.cover_note && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-faint">{a.cover_note}</p>
                    )}
                    {a.views_count != null && (
                      <p className="mt-1 text-xs font-semibold text-accent">
                        {formatCompactNumber(a.views_count, locale)} {t.campaignDetail.viewsShort}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
