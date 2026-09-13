import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Toast } from '@/components/toast';
import { LinkButton } from '@/components/ui';
import { ToolTable, ToolEmptyRow } from '@/components/tool-ui';
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
      <main className="py-6 sm:py-8">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <h1 className="text-sm font-semibold uppercase tracking-wide text-text-faint">{t.clip.clientTitle}</h1>
              <p className="mt-1 text-xs text-text-faint">{t.clip.clientSubtitle}</p>
            </div>
            {/* Заказчик — не «сторона», а роль; синий, а не брендовый розовый (Tool mode). */}
            <LinkButton href="/dashboard/new" variant="primary">
              {t.clip.newCampaignBtn}
            </LinkButton>
          </div>

          <div className="mt-6">
            <ToolTable>
              <thead>
                <tr>
                  <th>{t.clip.clientTitle}</th>
                  <th className="num">{t.clip.budgetLeftLabel}</th>
                  <th className="num">{t.clip.spentLabel}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 && <ToolEmptyRow colSpan={4} text={t.clip.noCampaignsClient} />}
                {campaigns.map((c) => {
                  const available = Math.max(c.budget_total - c.budget_reserved - c.budget_spent, 0);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/dashboard/campaigns/${c.id}`} className="text-accent hover:underline">
                          {c.title}
                        </Link>
                      </td>
                      <td className="num font-mono tabular-nums text-text">{available} $</td>
                      <td className="num font-mono tabular-nums">{c.budget_spent} $</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ToolTable>
          </div>
        </Container>
      </main>
    </>
  );
}
