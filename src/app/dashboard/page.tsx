import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Toast } from '@/components/toast';
import { Card, LinkButton, EmptyState } from '@/components/ui';
import { Megaphone } from 'lucide-react';
import { Container } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
import type { Campaign } from '@/lib/types';

export default async function ClientDashboardPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'artist' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: campaignsRaw } = profile
    ? await supabase.from('campaigns').select('*').eq('artist_id', profile.id).order('created_at', { ascending: false })
    : { data: [] };

  const campaigns = (campaignsRaw ?? []) as (Campaign & { id: string })[];

  return (
    <>
      <Nav />
      <Toast successParam="created" successMessage={t.clip.reportTitle} />
      <main className="py-12">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-headline text-text">{t.clip.clientTitle}</h1>
              <p className="mt-1 text-body text-text-dim">{t.clip.clientSubtitle}</p>
            </div>
            <LinkButton href="/dashboard/new" variant="artist">
              {t.clip.newCampaignBtn}
            </LinkButton>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {campaigns.length === 0 && <EmptyState icon={Megaphone} text={t.clip.noCampaignsClient} />}
            {campaigns.map((c) => {
              const available = Math.max(c.budget_total - c.budget_reserved - c.budget_spent, 0);
              return (
                <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-accent/60">
                    <div>
                      <p className="text-sm font-semibold text-text">{c.title}</p>
                      <p className="mt-1 text-xs text-text-faint">
                        {t.clip.budgetLeftLabel}: {available} $ · {t.clip.spentLabel}: {c.budget_spent} $
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Card>
                </Link>
              );
            })}
          </div>
        </Container>
      </main>
    </>
  );
}
