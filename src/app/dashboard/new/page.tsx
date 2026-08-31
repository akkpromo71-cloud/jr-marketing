import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Card, Field, inputClass, Button, BackLink } from '@/components/ui';
import { createCampaignAction } from '@/app/dashboard/actions';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { getDict } from '@/lib/i18n';

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== 'artist' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const { t } = await getDict();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-lg px-6 py-12">
        <BackLink href="/dashboard" label={t.common.back} />
        <h1 className="font-display text-3xl font-medium text-text">{t.dashboardNew.title}</h1>
        <p className="mt-1 text-sm text-text-dim">{t.dashboardNew.subtitle}</p>

        <Card className="mt-8 p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}
          <form action={createCampaignAction} className="flex flex-col gap-4">
            <Field label={t.dashboardNew.name}>
              <input className={inputClass} name="title" required placeholder={t.dashboardNew.namePlaceholder} />
            </Field>
            <Field label={t.dashboardNew.description}>
              <textarea
                className={inputClass}
                name="description"
                rows={4}
                required
                placeholder={t.dashboardNew.descriptionPlaceholder}
              />
            </Field>
            <Field label={t.dashboardNew.trackLink}>
              <input className={inputClass} name="track_url" placeholder="https://..." />
            </Field>
            <Field label={t.dashboardNew.spotifyLink}>
              <input className={inputClass} name="spotify_url" placeholder="https://open.spotify.com/..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t.dashboardNew.budget}>
                <input className={inputClass} type="number" name="budget" min={0} />
              </Field>
              <Field label={t.dashboardNew.maxEditors}>
                <input className={inputClass} type="number" name="max_editors" min={1} defaultValue={1} />
              </Field>
            </div>
            <Button type="submit" variant="primary" className="mt-2 w-full">
              {t.dashboardNew.publishBtn}
            </Button>
          </form>
        </Card>
      </main>
    </>
  );
}
