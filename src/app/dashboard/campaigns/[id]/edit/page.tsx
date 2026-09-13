import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { Button, Field, inputClass, BackLink } from '@/components/ui';
import { Container } from '@/components/layout';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/current-profile';
import { roleHome } from '@/lib/role-home';
import { updateCampaignAction } from '@/app/dashboard/actions';
import { getDict } from '@/lib/i18n';
import type { Campaign } from '@/lib/types';

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
  if (profile && profile.role !== 'artist' && profile.role !== 'admin') {
    redirect(roleHome(profile.role));
  }
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();
  const c = campaign as Campaign & { id: string };
  if (profile?.role !== 'admin' && c.artist_id !== profile?.id) redirect('/dashboard');

  return (
    <>
      <Nav />
      <main className="py-12">
        <Container width="text">
          <BackLink href={`/dashboard/campaigns/${id}`} label={t.common.back} />
          <h1 className="text-headline text-text">{t.clip.editBtn}</h1>

          {error && (
            <div className="mt-6 rounded-[4px] border border-[var(--danger-tint-border)] bg-[var(--danger-tint-bg)] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={updateCampaignAction} className="mt-8 flex flex-col gap-4">
            <input type="hidden" name="campaign_id" value={id} />
            <Field label={t.clip.nameLabel}>
              <input className={inputClass} name="title" required maxLength={200} defaultValue={c.title} />
            </Field>
            <Field label={t.clip.descriptionLabel}>
              <textarea className={inputClass} name="description" rows={4} required defaultValue={c.description} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.clip.cpmRateLabel}>
                <input className={inputClass} name="cpm_rate" type="number" step="0.01" min="0" required defaultValue={c.cpm_rate ?? ''} />
              </Field>
              <Field label={t.clip.clientCpmLabel}>
                <input className={inputClass} name="client_cpm" type="number" step="0.01" min="0" required defaultValue={c.client_cpm ?? ''} />
              </Field>
              <Field label={t.clip.perClipCapLabel}>
                <input className={inputClass} name="per_clip_cap" type="number" step="0.01" min="0" required defaultValue={c.per_clip_cap ?? ''} />
              </Field>
              <Field label={t.clip.maxClipsLabel}>
                <input className={inputClass} name="max_clips_per_clipper" type="number" min="1" defaultValue={c.max_clips_per_clipper ?? 5} />
              </Field>
              <Field label={t.clip.slotTtlLabel}>
                <input className={inputClass} name="slot_ttl_hours" type="number" min="1" defaultValue={c.slot_ttl_hours} />
              </Field>
            </div>

            <Field label={t.clip.platformsLabel}>
              <div className="flex flex-wrap gap-4">
                {(['tiktok', 'reels', 'shorts'] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-text-dim">
                    <input type="checkbox" name="platforms" value={p} defaultChecked={c.platforms.includes(p)} className="h-4 w-4" />
                    {p}
                  </label>
                ))}
              </div>
            </Field>

            <Field label={t.clip.requiredCaptionLabel}>
              <input className={inputClass} name="required_caption" maxLength={300} defaultValue={c.required_caption ?? ''} />
            </Field>

            <Field label={t.clip.rulesLabel}>
              <textarea className={inputClass} name="rules" rows={4} maxLength={3000} defaultValue={c.rules ?? ''} />
            </Field>

            <Field label={t.clip.sourceUrlsLabel}>
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <input key={i} className={inputClass} name="source_urls" type="url" defaultValue={c.source_urls?.[i] ?? ''} placeholder="https://" />
                ))}
              </div>
            </Field>

            <Field label={t.clip.trackSoundUrlLabel}>
              <input className={inputClass} name="track_sound_url" type="url" defaultValue={c.track_sound_url ?? ''} />
            </Field>

            <Button type="submit" variant="artist" className="self-start">
              {t.settings.saveBtn}
            </Button>
          </form>
        </Container>
      </main>
    </>
  );
}
