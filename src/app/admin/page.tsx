import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Button, Field, inputClass, EmptyState } from '@/components/ui';
import { Inbox } from 'lucide-react';
import { Container, Grid } from '@/components/layout';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/avatar';
import { approveEditorAction, rejectEditorAction } from '@/app/admin/actions';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { updateApplicationStatusAction } from '@/app/applications/[id]/actions';
import { getDict } from '@/lib/i18n';
import { formatCompactNumber } from '@/lib/format';
import type { Application, Campaign, Profile } from '@/lib/types';

type PendingApplication = Application & {
  profiles: Profile;
  campaigns: { id: string; title: string } | null;
};

type EditorAvgViews = { editor_id: string; avg_views: number | null; completed_count: number };

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') redirect(roleHome(profile?.role));

  const supabase = await createClient();
  const { locale, t } = await getDict();

  // Данные и запросы НЕ менялись (REDESIGN_PLAN.md §6) — только плотность и
  // раскладка: «режим модерации» считывается по более высокой плотности.
  const { data: pendingEditors } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'editor')
    .eq('editor_status', 'pending')
    .order('created_at', { ascending: true });

  const { data: pendingApplications } = await supabase
    .from('applications')
    .select('*, profiles(*), campaigns(id, title)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const { data: approvedEditors } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'editor')
    .eq('editor_status', 'approved')
    .order('created_at', { ascending: false });

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(20);

  const editorIds = Array.from(
    new Set(
      [
        ...((pendingEditors as Profile[] | null) ?? []).map((e) => e.id),
        ...((pendingApplications as PendingApplication[] | null) ?? []).map((a) => a.profiles?.id).filter(Boolean),
        ...((approvedEditors as Profile[] | null) ?? []).map((e) => e.id),
      ] as string[]
    )
  );
  const { data: avgViewsRows } = editorIds.length
    ? await supabase.rpc('get_editor_avg_views', { p_editor_ids: editorIds })
    : { data: [] as EditorAvgViews[] };
  const avgViewsMap = new Map(
    ((avgViewsRows as EditorAvgViews[] | null) ?? []).map((r) => [r.editor_id, r])
  );

  const queues = [
    { href: '#pending', label: t.admin.pendingTitle, count: pendingEditors?.length ?? 0 },
    { href: '#applications', label: t.admin.pendingApplicationsTitle, count: pendingApplications?.length ?? 0 },
    { href: '#approved', label: t.admin.approvedTitle, count: approvedEditors?.length ?? 0 },
    { href: '#campaigns', label: t.admin.recentCampaignsTitle, count: campaigns?.length ?? 0 },
  ];

  return (
    <>
      <Nav />
      <main className="py-10">
        <Container>
          <h1 className="text-headline text-text">{t.admin.title}</h1>
          <p className="mt-1 text-body text-text-dim">{t.admin.subtitle}</p>

          <Grid className="mt-8">
            {/* Левая навигация по очередям — «стол модерации». */}
            <nav
              aria-label={t.admin.queuesLabel}
              className="flex flex-col gap-1 md:col-span-3 md:sticky md:top-24 md:self-start"
            >
              <p className="mb-2 text-meta text-text-faint">{t.admin.queuesLabel}</p>
              {queues.map((q) => (
                <a
                  key={q.href}
                  href={q.href}
                  className="flex items-center justify-between gap-3 border-l-2 border-l-border py-2 pl-3 pr-2 text-sm text-text-dim transition hover:border-l-accent hover:text-text"
                >
                  <span>{q.label}</span>
                  <span className="tabular text-text-faint">{q.count}</span>
                </a>
              ))}
            </nav>

            <div className="md:col-span-9">
              {/* ── Эдиторы на модерации ── */}
              <section id="pending" className="scroll-mt-24">
                <h2 className="mb-3 text-meta text-text-faint">
                  {t.admin.pendingTitle} ({pendingEditors?.length ?? 0})
                </h2>
                <div className="flex flex-col divide-y divide-border border border-border">
                  {(pendingEditors ?? []).length === 0 && (
                    <div className="p-4">
                      <EmptyState icon={Inbox} text={t.admin.noNewApplications} />
                    </div>
                  )}
                  {(pendingEditors as Profile[] | null)?.map((e) => (
                    <div key={e.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar url={e.avatar_url} name={e.display_name} size={28} />
                        <div className="text-sm">
                          <p className="text-text">{e.display_name}</p>
                          {e.bio && <p className="mt-0.5 max-w-md text-text-dim">{e.bio}</p>}
                          <p className="mt-1 text-xs text-text-faint">
                            {t.admin.wishPrice}: <span className="tabular">{e.price_min ?? '—'}</span> $
                            {e.portfolio_url && (
                              <>
                                {' · '}
                                <a href={e.portfolio_url} target="_blank" className="text-accent hover:underline">
                                  {locale === 'en' ? 'works' : 'работы'}
                                </a>
                              </>
                            )}
                          </p>
                          <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-text-faint">
                            {e.followers != null && (
                              <span className="tabular">
                                {t.admin.followersLabel}: {formatCompactNumber(e.followers, locale)}
                              </span>
                            )}
                            {e.telegram && <span>TG: {e.telegram}</span>}
                            {e.instagram &&
                              (e.instagram.startsWith('http') ? (
                                <a href={e.instagram} target="_blank" className="text-accent hover:underline">
                                  IG
                                </a>
                              ) : (
                                <span>IG: {e.instagram}</span>
                              ))}
                            {e.tiktok &&
                              (e.tiktok.startsWith('http') ? (
                                <a href={e.tiktok} target="_blank" className="text-accent hover:underline">
                                  TT
                                </a>
                              ) : (
                                <span>TT: {e.tiktok}</span>
                              ))}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-end gap-2">
                        <form action={approveEditorAction} className="flex items-end gap-2">
                          <input type="hidden" name="editor_id" value={e.id} />
                          <Field label={t.admin.price}>
                            <input className={`${inputClass} w-20`} type="number" name="price" min={0} defaultValue={e.price_min ?? ''} />
                          </Field>
                          <Button type="submit" variant="primary">
                            {t.admin.approveBtn}
                          </Button>
                        </form>
                        <form action={rejectEditorAction}>
                          <input type="hidden" name="editor_id" value={e.id} />
                          <Button type="submit" variant="danger">
                            {t.admin.rejectBtn}
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Заявки на кампании ── */}
              <section id="applications" className="mt-10 scroll-mt-24">
                <h2 className="mb-3 text-meta text-text-faint">
                  {t.admin.pendingApplicationsTitle} ({pendingApplications?.length ?? 0})
                </h2>
                <div className="flex flex-col divide-y divide-border border border-border">
                  {(pendingApplications ?? []).length === 0 && (
                    <div className="p-4">
                      <EmptyState icon={Inbox} text={t.admin.noPendingApplications} />
                    </div>
                  )}
                  {(pendingApplications as PendingApplication[] | null)?.map((a) => (
                    <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 text-sm">
                        <Avatar url={a.profiles?.avatar_url ?? null} name={a.profiles?.display_name ?? '?'} size={28} />
                        <div>
                          <p className="text-text">{a.profiles?.display_name}</p>
                          <p className="mt-0.5 text-xs text-text-faint">
                            {t.admin.campaignLabel}: {a.campaigns?.title ?? '—'}
                            {a.price ? ` · ${t.applicationDetail.price}: ${a.price} $` : ''}
                          </p>
                          <p className="mt-1 text-xs text-text-faint">
                            {a.profiles?.followers != null && (
                              <span className="tabular">
                                {t.admin.followersLabel}: {formatCompactNumber(a.profiles.followers, locale)}
                              </span>
                            )}
                            {a.profiles?.followers != null && avgViewsMap.get(a.profiles.id)?.avg_views != null && ' · '}
                            {avgViewsMap.get(a.profiles?.id)?.avg_views != null && (
                              <span className="tabular">
                                {t.admin.avgViewsLabel}:{' '}
                                {formatCompactNumber(Math.round(avgViewsMap.get(a.profiles.id)!.avg_views!), locale)}
                              </span>
                            )}
                          </p>
                          {a.cover_note && <p className="mt-1 max-w-md text-text-dim">{a.cover_note}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <form action={updateApplicationStatusAction}>
                          <input type="hidden" name="application_id" value={a.id} />
                          <input type="hidden" name="status" value="accepted" />
                          <Button type="submit" variant="primary">
                            {t.applicationDetail.acceptBtn}
                          </Button>
                        </form>
                        <form action={updateApplicationStatusAction}>
                          <input type="hidden" name="application_id" value={a.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <Button type="submit" variant="danger">
                            {t.applicationDetail.rejectBtn}
                          </Button>
                        </form>
                        <Link
                          href={`/applications/${a.id}`}
                          className="self-center text-xs text-text-faint hover:text-accent hover:underline"
                        >
                          {locale === 'en' ? 'Details' : 'Подробнее'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Одобренные эдиторы (плотная таблица) ── */}
              <section id="approved" className="mt-10 scroll-mt-24">
                <h2 className="mb-3 text-meta text-text-faint">
                  {t.admin.approvedTitle} ({approvedEditors?.length ?? 0})
                </h2>
                <div className="flex flex-col divide-y divide-border border border-border">
                  {(approvedEditors as Profile[] | null)?.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar url={e.avatar_url} name={e.display_name} size={24} />
                        <span className="text-text">{e.display_name}</span>
                      </div>
                      <span className="tabular text-xs text-text-faint">
                        {e.price_min} $
                        {e.followers != null && ` · ${t.admin.followersLabel}: ${formatCompactNumber(e.followers, locale)}`}
                        {avgViewsMap.get(e.id)?.avg_views != null &&
                          ` · ${t.admin.avgViewsLabel}: ${formatCompactNumber(Math.round(avgViewsMap.get(e.id)!.avg_views!), locale)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Последние кампании (плотная таблица) ── */}
              <section id="campaigns" className="mt-10 scroll-mt-24">
                <h2 className="mb-3 text-meta text-text-faint">{t.admin.recentCampaignsTitle}</h2>
                <div className="flex flex-col divide-y divide-border border border-border">
                  {(campaigns as (Campaign & { profiles: { display_name: string; avatar_url: string | null } })[] | null)?.map(
                    (c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/campaigns/${c.id}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-surface2/20"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar url={c.profiles?.avatar_url ?? null} name={c.profiles?.display_name ?? '?'} size={24} />
                          <span className="text-text">{c.title}</span>
                          <span className="text-xs text-text-faint">· {c.profiles?.display_name}</span>
                        </div>
                        <StatusBadge status={c.status} />
                      </Link>
                    )
                  )}
                </div>
              </section>
            </div>
          </Grid>
        </Container>
      </main>
    </>
  );
}
