import { notFound, redirect } from 'next/navigation';
import { Card, Field, inputClass, Button, BackLink } from '@/components/ui';
import { Nav } from '@/components/nav';
import { Container } from '@/components/layout';
import { updateCampaignAction } from '@/app/dashboard/actions';
import { getCurrentProfile } from '@/lib/current-profile';
import { createClient } from '@/lib/supabase/server';
import { campaignIsEditable } from '@/lib/campaign-editable';
import { getDict } from '@/lib/i18n';
import type { Campaign } from '@/lib/types';

// Правка уже опубликованной кампании. Доступна только владельцу и только пока
// campaignIsEditable — ту же проверку повторяет updateCampaignAction, здесь она
// нужна, чтобы не показывать форму, которую всё равно не дадут сохранить.
// Поля — те же, что в /dashboard/new, но без согласия с условиями (оно уже
// дано при публикации) и без «сколько эдитов нужно»: число слотов после
// публикации не меняем, чтобы не трогать логику приёма заявок.
export default async function EditCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();

  const c = campaign as Campaign;
  if (profile?.id !== c.artist_id) notFound();

  if (!(await campaignIsEditable(supabase, id, c.status))) {
    redirect(`/dashboard/campaigns/${id}`);
  }

  // Минимально допустимый дедлайн — завтра, как и в форме публикации
  // (futureDateOrNull в src/lib/validate.ts проверяет то же самое на сервере).
  const minDeadline = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const references = c.reference_urls ?? [];

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container width="text">
          <BackLink href={`/dashboard/campaigns/${id}`} label={t.common.back} />
          <h1 className="text-headline text-text">{t.campaignDetail.editTitle}</h1>
          <p className="mt-2 text-body text-text-dim">{t.campaignDetail.editSubtitle}</p>

          <Card className="mt-8 p-6">
            {error && (
              <div className="mb-4 rounded-[4px] border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
                {decodeURIComponent(error)}
              </div>
            )}
            <form action={updateCampaignAction} className="flex flex-col gap-4">
              <input type="hidden" name="campaign_id" value={c.id} />

              <Field label={t.dashboardNew.name}>
                <input
                  className={inputClass}
                  name="title"
                  required
                  defaultValue={c.title}
                  placeholder={t.dashboardNew.namePlaceholder}
                />
              </Field>
              <Field label={t.dashboardNew.description}>
                <textarea
                  className={inputClass}
                  name="description"
                  rows={4}
                  required
                  defaultValue={c.description}
                  placeholder={t.dashboardNew.descriptionPlaceholder}
                />
              </Field>

              <Field label={t.dashboardNew.deadline}>
                <input
                  className={inputClass}
                  type="date"
                  name="deadline"
                  required
                  min={minDeadline}
                  defaultValue={c.deadline ?? ''}
                />
                <span className="mt-1 text-xs text-text-faint">{t.dashboardNew.deadlineHint}</span>
              </Field>

              <Field label={t.dashboardNew.budget}>
                <span className="relative block">
                  <input
                    className={`${inputClass} pr-14`}
                    type="number"
                    name="budget"
                    min={1}
                    required
                    defaultValue={c.budget ?? ''}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-faint">
                    {t.dashboardNew.budgetCurrency}
                  </span>
                </span>
              </Field>

              <Field label={t.dashboardNew.captionTitle}>
                <input
                  className={inputClass}
                  name="track_title_for_caption"
                  defaultValue={c.track_title_for_caption ?? ''}
                  placeholder={t.dashboardNew.namePlaceholder}
                />
                <span className="mt-1 text-xs text-text-faint">{t.dashboardNew.captionTitleHint}</span>
              </Field>
              <Field label={t.dashboardNew.artistHandle}>
                <input
                  className={inputClass}
                  name="artist_handle"
                  defaultValue={c.artist_handle ?? ''}
                  placeholder={t.dashboardNew.artistHandlePlaceholder}
                />
              </Field>

              <Field label={t.dashboardNew.trackLink}>
                <input
                  className={inputClass}
                  name="track_url"
                  defaultValue={c.track_url ?? ''}
                  placeholder="https://..."
                />
              </Field>
              <Field label={t.dashboardNew.spotifyLink}>
                <input
                  className={inputClass}
                  name="spotify_url"
                  defaultValue={c.spotify_url ?? ''}
                  placeholder="https://open.spotify.com/..."
                />
              </Field>

              <Field label={t.dashboardNew.trackSegment}>
                <input
                  className={inputClass}
                  name="track_segment"
                  defaultValue={c.track_segment ?? ''}
                  placeholder={t.dashboardNew.trackSegmentPlaceholder}
                />
                <span className="mt-1 text-xs text-text-faint">{t.dashboardNew.trackSegmentHint}</span>
              </Field>
              <Field label={t.dashboardNew.references}>
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      className={inputClass}
                      type="url"
                      name="reference_urls"
                      defaultValue={references[i] ?? ''}
                      placeholder="https://..."
                    />
                  ))}
                </div>
                <span className="mt-1 text-xs text-text-faint">{t.dashboardNew.referencesHint}</span>
              </Field>
              <Field label={t.dashboardNew.restrictions}>
                <input
                  className={inputClass}
                  name="restrictions"
                  defaultValue={c.restrictions ?? ''}
                  placeholder={t.dashboardNew.restrictionsPlaceholder}
                />
              </Field>

              <Button type="submit" variant="primary" className="mt-2 w-full">
                {t.campaignDetail.editSaveBtn}
              </Button>
            </form>
          </Card>
        </Container>
      </main>
    </>
  );
}
