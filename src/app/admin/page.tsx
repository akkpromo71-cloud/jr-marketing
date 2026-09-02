import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, Field, inputClass, StatusBadge, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/avatar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { approveEditorAction, rejectEditorAction } from '@/app/admin/actions';
import { updateApplicationStatusAction } from '@/app/applications/[id]/actions';
import { getDict } from '@/lib/i18n';
import type { Application, Campaign, Profile } from '@/lib/types';

type PendingApplication = Application & {
  profiles: Profile;
  campaigns: { id: string; title: string } | null;
};

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') redirect(roleHome(profile?.role));

  const supabase = await createClient();
  const { locale, t } = await getDict();

  const { data: pendingEditors } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'editor')
    .eq('editor_status', 'pending')
    .order('created_at', { ascending: true });

  // Заявки эдиторов на конкретные кампании (кто хочет взять трек в работу) —
  // отдельная очередь от модерации самих эдиторов выше. Пока заявка тут, эдитор
  // ничего не может сдать — форма сдачи работы открывается только после
  // status='accepted' (см. src/app/applications/[id]/page.tsx). Решение —
  // только за администратором: ни артист, ни сам эдитор одобрить/отклонить
  // заявку не могут (см. supabase/patch-manager-only-applications.sql).
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

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-3xl font-medium text-text">{t.admin.title}</h1>
        <p className="mt-1 text-sm text-text-dim">{t.admin.subtitle}</p>

        <section className="mt-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
            {t.admin.pendingTitle} ({pendingEditors?.length ?? 0})
          </h2>
          <div className="flex flex-col gap-4">
            {(pendingEditors ?? []).length === 0 && <EmptyState icon="✅" text={t.admin.noNewApplications} />}
            {(pendingEditors as Profile[] | null)?.map((e) => (
              <Card key={e.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar url={e.avatar_url} name={e.display_name} size={44} />
                    <div>
                      <h3 className="font-display text-lg font-medium text-text">{e.display_name}</h3>
                      {e.bio && <p className="mt-1 max-w-md text-sm text-text-dim">{e.bio}</p>}
                      <p className="mt-2 text-xs text-text-faint">
                        {t.admin.wishPrice}: {e.price_min ?? '—'} $
                        {e.portfolio_url && (
                          <>
                            {' · '}
                            <a href={e.portfolio_url} target="_blank" className="text-accent hover:underline">
                              {locale === 'en' ? 'works' : 'работы'}
                            </a>
                          </>
                        )}
                      </p>
                      <div className="mt-1 flex gap-2 text-xs text-text-faint">
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
                      </div>
                    </div>
                  </div>
                </div>

                <form action={approveEditorAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                  <input type="hidden" name="editor_id" value={e.id} />
                  <Field label={t.admin.price}>
                    <input className={`${inputClass} w-28`} type="number" name="price" defaultValue={e.price_min ?? ''} />
                  </Field>
                  <Button type="submit" variant="primary">
                    {t.admin.approveBtn}
                  </Button>
                </form>
                <form action={rejectEditorAction} className="mt-2">
                  <input type="hidden" name="editor_id" value={e.id} />
                  <Button type="submit" variant="danger">
                    {t.admin.rejectBtn}
                  </Button>
                </form>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
            {t.admin.pendingApplicationsTitle} ({pendingApplications?.length ?? 0})
          </h2>
          <div className="flex flex-col gap-4">
            {(pendingApplications ?? []).length === 0 && (
              <EmptyState icon="✅" text={t.admin.noPendingApplications} />
            )}
            {(pendingApplications as PendingApplication[] | null)?.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar url={a.profiles?.avatar_url ?? null} name={a.profiles?.display_name ?? '?'} size={44} />
                  <div>
                    <h3 className="font-display text-lg font-medium text-text">{a.profiles?.display_name}</h3>
                    <p className="mt-1 text-xs text-text-faint">
                      {t.admin.campaignLabel}: {a.campaigns?.title ?? '—'}
                      {a.price ? ` · ${t.applicationDetail.price}: ${a.price} $` : ''}
                    </p>
                    {a.cover_note && <p className="mt-2 max-w-md text-sm text-text-dim">{a.cover_note}</p>}
                  </div>
                </div>

                <div className="mt-4 flex gap-3 border-t border-border pt-4">
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
                    className="ml-auto self-center text-xs text-text-faint hover:text-accent hover:underline"
                  >
                    {locale === 'en' ? 'Details' : 'Подробнее'}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">
            {t.admin.approvedTitle} ({approvedEditors?.length ?? 0})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(approvedEditors as Profile[] | null)?.map((e) => (
              <Card key={e.id} className="flex items-center gap-3 p-4 hover:-translate-y-0.5 hover:border-accent/40">
                <Avatar url={e.avatar_url} name={e.display_name} size={36} />
                <div>
                  <p className="font-medium text-text">{e.display_name}</p>
                  <p className="mt-1 text-xs text-text-faint">{e.price_min} $</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">{t.admin.recentCampaignsTitle}</h2>
          <div className="flex flex-col gap-3">
            {(campaigns as (Campaign & { profiles: { display_name: string; avatar_url: string | null } })[] | null)?.map(
              (c) => (
                <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
                  <Card className="flex items-center justify-between p-4 hover:-translate-y-0.5 hover:border-accent/50">
                    <div className="flex items-center gap-3">
                      <Avatar url={c.profiles?.avatar_url ?? null} name={c.profiles?.display_name ?? '?'} size={36} />
                      <div>
                        <p className="font-medium text-text">{c.title}</p>
                        <p className="text-xs text-text-faint">
                          {t.admin.artist}: {c.profiles?.display_name}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </Card>
                </Link>
              )
            )}
          </div>
        </section>
      </main>
    </>
  );
}
