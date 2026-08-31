import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, StatusBadge, EmptyState } from '@/components/ui';
import { Toast } from '@/components/toast';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
import type { Application, Campaign } from '@/lib/types';

export default async function ApplicationsPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'editor' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: applications } = profile
    ? await supabase
        .from('applications')
        .select('*, campaigns(*)')
        .eq('editor_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] };

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-medium text-text">{t.applicationsList.title}</h1>
        <p className="mt-1 text-sm text-text-dim">{t.applicationsList.subtitle}</p>

        <Toast successParam="applied" successMessage={t.applicationsList.appliedMsg} />

        <div className="mt-8 flex flex-col gap-4">
          {(applications ?? []).length === 0 && <EmptyState icon="📨" text={t.applicationsList.noApplications} />}
          {(applications as (Application & { campaigns: Campaign })[] | null)?.map((a) => (
            <Link key={a.id} href={`/applications/${a.id}`}>
              <Card className="p-5 hover:-translate-y-0.5 hover:border-accent/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-medium text-text">{a.campaigns?.title}</h2>
                    {a.price && (
                      <p className="mt-1 text-sm text-text-dim">
                        {t.applicationsList.yourPrice}: {a.price} $
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
