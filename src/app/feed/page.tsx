import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Container } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { ToolTable, ToolEmptyRow } from '@/components/tool-ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
import type { Campaign } from '@/lib/types';

// Лента открытых клиппинг-кампаний (Этап 3), режим «инструмент» — см.
// design-system/jr-marketing/MASTER.md, раздел Tool mode. Видны кампании в
// статусах funded/active — campaigns_select уже отдаёт их (см.
// supabase/migrations/0003_clipping_platform.sql).
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'editor' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: campaignsRaw } = await supabase
    .from('campaigns')
    .select('*')
    .in('status', ['funded', 'active'])
    .order('created_at', { ascending: false });

  const clientIds = [...new Set((campaignsRaw ?? []).map((c) => c.artist_id))];
  const { data: clientProfiles } = clientIds.length
    ? await supabase.from('profiles_public').select('id, display_name, avatar_url').in('id', clientIds)
    : { data: [] as { id: string; display_name: string; avatar_url: string | null }[] };
  const clientById = new Map((clientProfiles ?? []).map((p) => [p.id, p]));
  const campaigns = (campaignsRaw ?? []).map((c) => ({
    ...c,
    profiles: clientById.get(c.artist_id) ?? null,
  }));

  const pending = profile?.editor_status === 'pending';
  const rejected = profile?.editor_status === 'rejected';

  type FeedCampaign = Campaign & { id: string; profiles: { display_name: string; avatar_url: string | null } | null };
  const list = campaigns as FeedCampaign[];

  return (
    <>
      <Nav />
      <main className="py-6 sm:py-8">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <h1 className="text-sm font-semibold uppercase tracking-wide text-text-faint">{t.clip.feedTitle}</h1>
              <p className="mt-2 font-mono text-4xl font-medium tabular-nums text-text">{list.length}</p>
            </div>
            <p className="max-w-sm text-xs text-text-faint">{t.clip.feedSubtitle}</p>
          </div>

          {error && (
            <p className="mt-4 border-l-2 border-[var(--danger-tint-border)] pl-3 text-xs text-danger">
              {decodeURIComponent(error)}
            </p>
          )}
          {pending && (
            <div className="mt-4 border-l-2 border-[var(--warning-tint-border)] pl-3">
              <p className="text-meta text-warning">{t.clip.pendingTitle}</p>
              <p className="mt-1 text-xs text-warning">{t.clip.pendingMsg}</p>
            </div>
          )}
          {rejected && (
            <p className="mt-4 border-l-2 border-[var(--danger-tint-border)] pl-3 text-xs text-danger">
              {t.clip.rejectedMsg}
            </p>
          )}

          <div className="mt-6">
            <ToolTable>
              <thead>
                <tr>
                  <th>{t.clip.feedTitle}</th>
                  <th>{t.clip.clientLabel}</th>
                  <th className="num">{t.clip.cpmLabel}</th>
                  <th className="num">{t.clip.budgetLeftLabel}</th>
                  <th className="num">{t.clip.slotsLeftLabel}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && <ToolEmptyRow colSpan={6} text={t.clip.noCampaigns} />}
                {list.map((c) => {
                  const available = Math.max(c.budget_total - c.budget_reserved - c.budget_spent, 0);
                  const slotsLeft = c.per_clip_cap ? Math.floor(available / c.per_clip_cap) : null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/feed/${c.id}`} className="text-accent hover:underline">
                          {c.title}
                        </Link>
                      </td>
                      <td>{c.profiles?.display_name ?? '—'}</td>
                      <td className="num font-mono tabular-nums text-text">{c.cpm_rate != null ? `${c.cpm_rate} $` : '—'}</td>
                      <td className="num font-mono tabular-nums text-text">{available} $</td>
                      <td className="num font-mono tabular-nums">{slotsLeft ?? '—'}</td>
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
