import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Button, Field, inputClass, StatusBadge } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { approveEditorAction, rejectEditorAction } from '@/app/admin/actions';
import { getDict } from '@/lib/i18n';
import type { Campaign, Profile } from '@/lib/types';

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

  const { data: approvedEditors } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'editor')
    .eq('editor_status', 'approved')
    .order('created_at', { ascending: false });

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, profiles(display_name)')
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
            {(pendingEditors ?? []).length === 0 && (
              <Card className="p-6 text-center text-sm text-text-faint">{t.admin.noNewApplications}</Card>
            )}
            {(pendingEditors as Profile[] | null)?.map((e) => (
              <Card key={e.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-medium text-text">{e.display_name}</h3>
                    {e.bio && <p className="mt-1 max-w-md text-sm text-text-dim">{e.bio}</p>}
                    <p className="mt-2 text-xs text-text-faint">
                      {t.admin.wishPrice}: {e.price_min ?? '—'}–{e.price_max ?? '—'} $
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

                <form action={approveEditorAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                  <input type="hidden" name="editor_id" value={e.id} />
                  <Field label={t.admin.priceFrom}>
                    <input className={`${inputClass} w-28`} type="number" name="price_min" defaultValue={e.price_min ?? ''} />
                  </Field>
                  <Field label={t.admin.priceTo}>
                    <input className={`${inputClass} w-28`} type="number" name="price_max" defaultValue={e.price_max ?? ''} />
                  </Field>
                  <Field label={t.admin.orderLimit}>
                    <input className={`${inputClass} w-24`} type="number" name="active_cap" defaultValue={e.active_cap ?? 3} />
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
            {t.admin.approvedTitle} ({approvedEditors?.length ?? 0})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(approvedEditors as Profile[] | null)?.map((e) => (
              <Card key={e.id} className="p-4">
                <p className="font-medium text-text">{e.display_name}</p>
                <p className="mt-1 text-xs text-text-faint">
                  {e.price_min}–{e.price_max} $ · {t.admin.ordersLimit} {e.active_cap} {t.admin.ordersWord}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-faint">{t.admin.recentCampaignsTitle}</h2>
          <div className="flex flex-col gap-3">
            {(campaigns as (Campaign & { profiles: { display_name: string } })[] | null)?.map((c) => (
              <Card key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-text">{c.title}</p>
                  <p className="text-xs text-text-faint">
                    {t.admin.artist}: {c.profiles?.display_name}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
