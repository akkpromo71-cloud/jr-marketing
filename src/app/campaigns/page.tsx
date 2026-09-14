import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Container } from '@/components/layout';
import { LinkButton } from '@/components/ui';
import { ToolTable, ToolEmptyRow } from '@/components/tool-ui';
import { createClient } from '@/lib/supabase/server';
import { getDict } from '@/lib/i18n';
import type { Campaign, Platform } from '@/lib/types';

// Витрина открытых кампаний без регистрации (дифференциатор №7) — доступна
// анониму: RLS (campaigns_select) и grants (patch-grants.sql) уже разрешают
// anon читать campaigns со status in ('open','funded','active'), поэтому
// createClient() тут работает без сессии, без отдельной публичной функции.
export default async function PublicCampaignsPage() {
  const { t } = await getDict();
  const supabase = await createClient();

  const { data: campaignsRaw } = await supabase
    .from('campaigns')
    .select('*')
    .in('status', ['funded', 'active'])
    .order('created_at', { ascending: false });

  const list = (campaignsRaw ?? []) as (Campaign & { id: string })[];

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container>
          <h1 className="text-headline text-text">{t.publicCampaigns.title}</h1>
          <p className="mt-2 max-w-xl text-body text-text-dim">{t.publicCampaigns.subtitle}</p>

          <div className="mt-8">
            <ToolTable>
              <thead>
                <tr>
                  <th>{t.publicCampaigns.title}</th>
                  <th className="num">{t.clip.cpmLabel}</th>
                  <th className="num">{t.clip.budgetLeftLabel}</th>
                  <th className="num">{t.clip.slotsLeftLabel}</th>
                  <th>{t.clip.platformsLabel}</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && <ToolEmptyRow colSpan={5} text={t.publicCampaigns.noCampaigns} />}
                {list.map((c) => {
                  const available = Math.max(c.budget_total - c.budget_reserved - c.budget_spent, 0);
                  const slotsLeft = c.per_clip_cap ? Math.floor(available / c.per_clip_cap) : null;
                  return (
                    <tr key={c.id}>
                      <td className="text-text">{c.title}</td>
                      <td className="num font-mono tabular-nums text-text">{c.cpm_rate != null ? `${c.cpm_rate} $` : '—'}</td>
                      <td className="num font-mono tabular-nums text-text">{available} $</td>
                      <td className="num font-mono tabular-nums">{slotsLeft ?? '—'}</td>
                      <td>{(c.platforms as Platform[] | null)?.join(', ') ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </ToolTable>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href="/signup/editor" variant="primary">
              {t.publicCampaigns.ctaLabel}
            </LinkButton>
            <Link href="/" className="text-sm text-text-faint hover:text-text hover:underline">
              {t.common.back}
            </Link>
          </div>
        </Container>
      </main>
    </>
  );
}
