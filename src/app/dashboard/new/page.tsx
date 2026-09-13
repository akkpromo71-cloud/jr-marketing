import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Button, Field, inputClass, BackLink } from '@/components/ui';
import { Container } from '@/components/layout';
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
      <main className="py-12">
        <Container width="text">
          <BackLink href="/dashboard" label={t.common.back} />
          <h1 className="text-headline text-text">{t.clip.newTitle}</h1>
          <p className="mt-1 text-body text-text-dim">{t.clip.newSubtitle}</p>

          {error && (
            <div className="mt-6 rounded-[4px] border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={createCampaignAction} className="mt-8 flex flex-col gap-4">
            <Field label={t.clip.nameLabel}>
              <input className={inputClass} name="title" required maxLength={200} placeholder={t.clip.namePlaceholder} />
            </Field>
            <Field label={t.clip.descriptionLabel}>
              <textarea className={inputClass} name="description" rows={4} required placeholder={t.clip.descriptionPlaceholder} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.clip.cpmRateLabel}>
                <input className={inputClass} name="cpm_rate" type="number" step="0.01" min="0" required />
              </Field>
              <Field label={t.clip.clientCpmLabel}>
                <input className={inputClass} name="client_cpm" type="number" step="0.01" min="0" required />
              </Field>
              <Field label={t.clip.perClipCapLabel}>
                <input className={inputClass} name="per_clip_cap" type="number" step="0.01" min="0" required />
              </Field>
              <Field label={t.clip.maxClipsLabel}>
                <input className={inputClass} name="max_clips_per_clipper" type="number" min="1" defaultValue={5} />
              </Field>
              <Field label={t.clip.slotTtlLabel}>
                <input className={inputClass} name="slot_ttl_hours" type="number" min="1" defaultValue={72} />
              </Field>
              <Field label={t.clip.budgetTotalLabel}>
                <input className={inputClass} name="starting_deposit" type="number" step="0.01" min="0" placeholder="0" />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-text-faint">{t.clip.budgetTotalHint}</p>

            <Field label={t.clip.platformsLabel}>
              <div className="flex flex-wrap gap-4">
                {(['tiktok', 'reels', 'shorts'] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-text-dim">
                    <input type="checkbox" name="platforms" value={p} defaultChecked className="h-4 w-4" />
                    {p}
                  </label>
                ))}
              </div>
              <p className="text-xs text-text-faint">{t.clip.platformsHint}</p>
            </Field>

            <Field label={t.clip.requiredCaptionLabel}>
              <input className={inputClass} name="required_caption" maxLength={300} placeholder={t.clip.requiredCaptionPlaceholder} />
            </Field>

            <Field label={t.clip.rulesLabel}>
              <textarea className={inputClass} name="rules" rows={4} maxLength={3000} placeholder={t.clip.rulesPlaceholder} />
            </Field>

            <Field label={t.clip.sourceUrlsLabel}>
              <div className="flex flex-col gap-2">
                <input className={inputClass} name="source_urls" type="url" placeholder="https://" />
                <input className={inputClass} name="source_urls" type="url" placeholder="https://" />
                <input className={inputClass} name="source_urls" type="url" placeholder="https://" />
              </div>
            </Field>

            <Field label={t.clip.trackSoundUrlLabel}>
              <input className={inputClass} name="track_sound_url" type="url" placeholder="https://www.tiktok.com/music/..." />
            </Field>

            <Button type="submit" variant="artist" className="self-start">
              {t.clip.createBtn}
            </Button>
          </form>
        </Container>
      </main>
    </>
  );
}
