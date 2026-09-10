import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Container, Grid } from '@/components/layout';
import { ApplicationsList } from '@/components/applications-list';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';
import type { Application } from '@/lib/types';

// Общий split-pane каркас раздела заявок (REDESIGN_PLAN.md §5.4): слева —
// постоянная очередь заявок эдитора (общая для списка и детали), справа —
// содержимое конкретного роута. Запрос списка вынесен сюда, чтобы он не
// перезагружался при переходе между заявками.
export default async function ApplicationsLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'editor' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: applications } = profile
    ? await supabase
        .from('applications')
        .select('*, campaigns(title)')
        .eq('editor_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] };

  // Шаг, которого ждут от эдитора, однозначно выводится из статуса заявки:
  //   accepted / in_revision -> сдать (или переделать) черновик
  //   completed              -> опубликовать ролик и вставить ссылку
  //   pending / delivered    -> ход за нами, от эдитора ничего не нужно
  //   rejected               -> вообще ничего
  const nextStepFor = (a: Application): string | null => {
    if (a.status === 'accepted') return t.applicationsList.nextSubmitDraft;
    if (a.status === 'in_revision') return t.applicationsList.nextFixRevision;
    // Принято — публикуем; если ссылка на пост уже стоит, делать нечего.
    if (a.status === 'completed') return a.posted_url ? null : t.applicationsList.nextPublish;
    if (a.status === 'rejected') return null;
    return t.applicationsList.nextNothing;
  };

  const rows = ((applications ?? []) as (Application & { campaigns: { title: string } | null })[]).map(
    (a) => ({
      id: a.id,
      title: a.campaigns?.title ?? '—',
      status: a.status,
      price: a.price ?? null,
      nextStep: nextStepFor(a),
    })
  );

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container>
          <h1 className="text-headline text-text">{t.applicationsList.title}</h1>
          <p className="mt-1 text-body text-text-dim">{t.applicationsList.subtitle}</p>
          <Grid className="mt-8">
            <div className="md:col-span-4 md:sticky md:top-24 md:self-start">
              <ApplicationsList
                rows={rows}
                labels={{
                  queue: t.applicationsList.queueLabel,
                  empty: t.applicationsList.noApplications,
                  price: t.applicationsList.yourPrice,
                  statuses: t.status,
                }}
              />
            </div>
            <div className="md:col-span-8">{children}</div>
          </Grid>
        </Container>
      </main>
    </>
  );
}
